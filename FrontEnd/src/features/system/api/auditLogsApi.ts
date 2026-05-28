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
  }
};
