
import type { UserRole } from "@/types/user";
import { format } from 'date-fns';

/**
 * Represents one step in the clearance approval process.
 */
export interface ClearanceStep {
  stepId: string; // Unique identifier for this step instance
  department: string; // Department responsible (e.g., Library, Finance, HoD)
  approverRole: UserRole; // Role required to approve (e.g., hod, clearance_officer)
  status: 'Pending' | 'Approved' | 'Rejected';
  approverName?: string; // Name of the person who actioned
  approvalDate?: string; // ISO DateTime string
  comments?: string; // Comments from the approver
}

/**
 * Represents the overall clearance request for a student.
 */
export interface ClearanceRequest {
  requestId: string; // Unique identifier for the request
  studentId: string;
  studentName: string; // Include student name
  submissionDate: string; // ISO DateTime string
  overallStatus: 'Pending' | 'Approved' | 'Rejected' | 'In Progress';
  steps: ClearanceStep[];
  // Add other student details if needed, e.g., department, roll number
  studentDepartment?: string;
  studentRollNo?: string;
}

/**
 * Represents filters for querying clearance requests.
 */
export interface ClearanceFilters {
    status?: ClearanceRequest['overallStatus'];
    department?: string; // Filter by student department
    approverDepartment?: string; // Filter by department responsible for a step
    searchQuery?: string; // For student name or ID
}

// --- Student Functions ---

/**
 * Retrieves the current clearance status for a given student.
 * TODO: Implement backend logic.
 * @param studentId The ID of the student.
 * @returns A promise that resolves to the ClearanceRequest object or null if not found.
 */
export async function getStudentClearanceStatus(studentId: string): Promise<ClearanceRequest | null> {
  console.log(`Fetching clearance status for student: ${studentId}`);
  return null;
}

/**
 * Submits a new clearance request for a student.
 * TODO: Implement backend logic.
 * @param studentId The ID of the student submitting.
 * @param studentDetails Additional details like name, department, roll number.
 * @returns A promise resolving to the newly created ClearanceRequest.
 */
export async function submitClearanceRequest(studentId: string, studentDetails: { name: string, department: string, rollNo: string }): Promise<ClearanceRequest | { error: string }> {
    console.log(`Student ${studentId} submitting clearance request with details:`, studentDetails);
    return { error: "Backend not implemented." };
}


// --- HOD/Officer Functions ---

/**
 * Retrieves clearance requests needing action by a specific approver.
 * TODO: Implement backend logic.
 */
export async function getPendingClearanceActions(approverId: string, approverRole: UserRole, approverDepartment: string): Promise<ClearanceRequest[]> {
    console.log(`Fetching pending clearance actions for ${approverRole} in ${approverDepartment}`);
    return [];
}

/**
 * Retrieves all clearance requests.
 * TODO: Implement backend logic.
 */
export async function getAllClearanceRequests(filters?: ClearanceFilters): Promise<ClearanceRequest[]> {
    console.log("Fetching all clearance requests with filters:", filters);
    return [];
}


/**
 * Approves or rejects a specific clearance step.
 * TODO: Implement backend logic.
 */
export async function actionClearanceStep(
    requestId: string,
    stepId: string,
    action: 'Approve' | 'Reject',
    approverId: string,
    approverName: string,
    comments?: string
): Promise<{ success: boolean; message: string, request?: ClearanceRequest }> {
    console.log(`${approverName} ${action}ing step ${stepId} for request ${requestId}`);
    return { success: false, message: "Backend not implemented." };
}

// Helper function to determine overall status based on steps
function calculateOverallStatus(steps: ClearanceStep[]): ClearanceRequest['overallStatus'] {
    if (steps.some(step => step.status === 'Rejected')) {
        return 'Rejected';
    }
    if (steps.every(step => step.status === 'Approved')) {
        return 'Approved';
    }
    if (steps.some(step => step.status === 'Approved')) {
        return 'In Progress';
    }
    return 'Pending'; // If all are pending
}

// --- Calculate Progress ---
export const calculateProgress = (steps: ClearanceStep[]): number => {
    if (!steps || steps.length === 0) return 0;
    const approvedCount = steps.filter(s => s.status === 'Approved').length;
    return Math.round((approvedCount / steps.length) * 100);
};
