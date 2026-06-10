using System.Collections.Concurrent;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Services;

/// <summary>
/// Background service nhận audit log entries từ một in-memory queue
/// và ghi chúng vào database HOÀN TOÀN BẤT ĐỒNG BỘ.
///
/// Cơ chế: ActionFilter enqueue → Channel → BackgroundService dequeue → SaveChanges
/// Điều này đảm bảo API response KHÔNG BỊ BLOCK bởi I/O ghi log.
/// </summary>
public class AuditLogService : BackgroundService
{
    // Thread-safe in-memory queue
    private readonly ConcurrentQueue<AuditLogEntry> _queue = new();
    private readonly SemaphoreSlim _signal = new(0);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogService> _logger;
    private readonly IHostEnvironment _environment;

    // Batch processing — gom nhiều entries và ghi 1 lần để giảm DB roundtrip
    private const int BatchSize       = 20;
    private const int FlushIntervalMs = 3_000; // flush mỗi 3 giây dù chưa đủ batch

    public AuditLogService(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogService> logger,
        IHostEnvironment environment)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
        _environment  = environment;
    }

    /// <summary>
    /// Enqueue một audit entry — fire-and-forget từ phía caller (ActionFilter).
    /// Thread-safe, không blocking.
    /// </summary>
    public void Enqueue(AuditLogEntry entry)
    {
        _queue.Enqueue(entry);
        // Release semaphore để worker biết có dữ liệu mới
        if (_signal.CurrentCount == 0)
            _signal.Release();
    }

    /// <summary>
    /// Background worker loop — chạy suốt vòng đời ứng dụng.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_environment.IsEnvironment("Testing")) return;

        _logger.LogInformation("🔍 AuditLogService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Chờ có tín hiệu mới hoặc timeout flush interval
            await _signal.WaitAsync(TimeSpan.FromMilliseconds(FlushIntervalMs), stoppingToken)
                         .ConfigureAwait(false);

            await FlushQueueAsync(stoppingToken).ConfigureAwait(false);
        }

        // Graceful shutdown: flush toàn bộ entries còn lại trước khi tắt
        _logger.LogInformation("🔍 AuditLogService flushing remaining entries...");
        await FlushQueueAsync(CancellationToken.None).ConfigureAwait(false);
    }

    private async Task FlushQueueAsync(CancellationToken ct)
    {
        if (_queue.IsEmpty) return;

        var batch = new List<Auditlog>(BatchSize);

        while (batch.Count < BatchSize && _queue.TryDequeue(out var entry))
        {
            batch.Add(new Auditlog
            {
                Userid    = entry.UserId,
                Action    = entry.Action,
                Tablename = entry.TableName,
                Recordid  = entry.RecordId,
                Createdat = entry.CreatedAt,
            });
        }

        if (batch.Count == 0) return;

        try
        {
            using var scope   = _scopeFactory.CreateScope();
            var context       = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            context.Auditlogs.AddRange(batch);
            await context.SaveChangesAsync(ct).ConfigureAwait(false);

            _logger.LogDebug("✅ AuditLog: flushed {Count} entries.", batch.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AuditLog: failed to flush {Count} entries.", batch.Count);
            // Re-enqueue failed entries để không mất dữ liệu
            foreach (var log in batch)
            {
                _queue.Enqueue(new AuditLogEntry
                {
                    UserId    = log.Userid,
                    Action    = log.Action,
                    TableName = log.Tablename,
                    RecordId  = log.Recordid,
                    CreatedAt = log.Createdat ?? DateTime.Now,
                });
            }
        }
    }
}

/// <summary>
/// DTO nhẹ truyền giữa ActionFilter → AuditLogService (không phụ thuộc EF model).
/// </summary>
public record AuditLogEntry
{
    public int?    UserId    { get; init; }
    public string  Action    { get; init; } = string.Empty;
    public string? TableName { get; init; }
    public string? RecordId  { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.Now;
}
