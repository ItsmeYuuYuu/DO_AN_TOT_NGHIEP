# Huong dan sao luu PostgreSQL local

Tai lieu nay dung cho moi truong demo local cua du an Cuong Dien Thoai. He thong khong dat nut restore truc tiep trong trang quan tri de tranh rui ro ghi de database khi thao tac nham.

## Muc dich

- Sao luu database `ECommerDB` truoc khi demo hoac truoc khi sua du lieu lon.
- Giu mot ban backup co the phuc hoi bang cong cu PostgreSQL khi can.
- Khong commit file backup len Git.

## Script backup

Script nam tai:

```powershell
scripts\backup-postgres.ps1
```

Chay tu thu muc goc du an:

```powershell
.\scripts\backup-postgres.ps1
```

Mac dinh script se backup:

- Host: `localhost`
- Port: `5432`
- Database: `ECommerDB`
- User: `postgres`
- Thu muc output: `Database\backups`
- Dinh dang: PostgreSQL custom dump `.dump`

Script se hoi mat khau PostgreSQL khi chay, khong luu mat khau vao file.

## Tuy chinh tham so

Neu PostgreSQL khong dung user/port mac dinh:

```powershell
.\scripts\backup-postgres.ps1 -HostName localhost -Port 5432 -Database ECommerDB -Username postgres
```

Neu may chua nhan lenh `pg_dump` trong PATH, truyen duong dan truc tiep:

```powershell
.\scripts\backup-postgres.ps1 -PgDumpPath "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
```

Neu muon xuat file SQL plain text:

```powershell
.\scripts\backup-postgres.ps1 -PlainSql
```

## Vi tri file backup

File backup duoc tao trong:

```text
Database/backups/
```

Vi du:

```text
Database/backups/ECommerDB_20260627_091530.dump
```

Thu muc nay co `.gitignore` rieng de tranh commit nham cac file backup nang hoac chua du lieu ca nhan.

## Phuc hoi du lieu khi can

Khong chay lenh restore neu chua chac chan vi thao tac nay co the ghi de database hien tai. Khi can phuc hoi, nen tao database moi de test truoc.

Voi file `.dump`:

```powershell
createdb -U postgres "ECommerDB_RestoreTest"
pg_restore -U postgres -d "ECommerDB_RestoreTest" "Database\backups\ECommerDB_YYYYMMDD_HHMMSS.dump"
```

Voi file `.sql`:

```powershell
createdb -U postgres "ECommerDB_RestoreTest"
psql -U postgres -d "ECommerDB_RestoreTest" -f "Database\backups\ECommerDB_YYYYMMDD_HHMMSS.sql"
```

## Quy trinh khuyen nghi truoc buoi bao ve

1. Dong frontend/backend neu dang demo dang do.
2. Chay `.\scripts\backup-postgres.ps1`.
3. Kiem tra file backup moi trong `Database\backups`.
4. Khong sua/xoa file backup cuoi cung truoc buoi bao ve.
5. Neu can reset du lieu demo, tao them mot backup moi truoc khi thao tac.
