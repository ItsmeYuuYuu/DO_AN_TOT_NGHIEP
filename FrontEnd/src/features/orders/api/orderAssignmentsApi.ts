import apiClient from '@/api/apiClient';

export type WorkflowDepartment = 'Sales' | 'Warehouse';

export interface OrderAssignment {
  assignmentid: number;
  orderid: number;
  department: WorkflowDepartment;
  assigneduserid?: number;
  assigneduser?: string;
  assignedbyuserid?: number;
  assignedbyuser?: string;
  status: 'Pending' | 'Assigned' | 'Completed' | 'Cancelled';
  assignedat?: string;
  completedat?: string;
  note?: string;
}

export interface OrderWorkflowItem {
  orderid: number;
  orderdate?: string;
  orderstatus?: string;
  paymentmethod?: string;
  paymentstatus?: string;
  finalamount: number;
  paidamount: number;
  checkouttype?: string;
  shippingname?: string;
  shippingphone?: string;
  shippingaddress?: string;
  itemcount: number;
  devices: OrderWorkflowDevice[];
  assignment?: OrderAssignment;
}

export interface OrderWorkflowDevice {
  orderitemid: number;
  imei: string;
  productname?: string;
  variantsku?: string;
  inventorystatus?: string;
}

export interface AssignmentEmployee {
  userid: number;
  fullname: string;
  rolename: string;
}

export const orderAssignmentsApi = {
  getQueue: (department: WorkflowDepartment) =>
    apiClient.get<OrderWorkflowItem[]>(`/OrderAssignments/queue/${department}`),
  getEmployees: (department: WorkflowDepartment) =>
    apiClient.get<AssignmentEmployee[]>(`/OrderAssignments/employees/${department}`),
  claim: (orderId: number, department: WorkflowDepartment, note?: string) =>
    apiClient.post<OrderAssignment>(`/OrderAssignments/${orderId}/claim`, { department, note }),
  assign: (orderId: number, department: WorkflowDepartment, assigneduserid: number, note?: string) =>
    apiClient.post<OrderAssignment>(`/OrderAssignments/${orderId}/assign`, {
      department,
      assigneduserid,
      note,
    }),
  handoffToWarehouse: (orderId: number, note?: string) =>
    apiClient.post<OrderWorkflowItem>(`/OrderAssignments/${orderId}/handoff-to-warehouse`, { note }),
  markShipped: (orderId: number, imeis: string[], note?: string) =>
    apiClient.post<OrderWorkflowItem>(`/OrderAssignments/${orderId}/mark-shipped`, { imeis, note }),
};
