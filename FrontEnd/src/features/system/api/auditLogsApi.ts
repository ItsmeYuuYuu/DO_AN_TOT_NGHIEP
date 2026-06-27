import apiClient from '../../../api/apiClient';

export interface AuditLog {
  logid: number;
  userid: number | null;
  fullName: string | null;
  action: string;
  tablename: string | null;
  recordid: string | null;
  createdat: string;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  createLogs: number;
  updateLogs: number;
  deleteLogs: number;
  topUser: string;
  topUserCount: number;
  topEntity: string;
  topEntityCount: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetAuditLogsParams {
  userId?: number;
  action?: string;
  tableName?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export const auditLogsApi = {
  getLogs: async (params?: GetAuditLogsParams): Promise<PagedResult<AuditLog>> => {
    const response = await apiClient.get('/auditlogs', { params });
    return response.data;
  },
  getStats: async (params?: GetAuditLogsParams): Promise<AuditLogStats> => {
    const response = await apiClient.get('/auditlogs/stats', { params });
    return response.data;
  },
  exportXlsx: async (params?: GetAuditLogsParams): Promise<Blob> => {
    const response = await apiClient.get('/auditlogs/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
