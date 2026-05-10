
import type { UserRole, AuthUser } from "@/types/user";
import { format } from 'date-fns';

/**
 * Types of documents managed by the system.
 */
export type DocumentType = 'Exam Paper' | 'Notice' | 'Application Form' | 'Circular' | 'Letter' | 'Schedule' | 'Timetable' | 'Syllabus' | 'Other';

/**
 * Status of a document within the system.
 */
export type DocumentStatus = 'Uploaded' | 'Pending Approval' | 'Approved for Print' | 'Printing' | 'Printed' | 'Archived' | 'Rejected';

/**
 * Metadata associated with a document.
 */
export interface DocumentMetadata {
  department: string;
  description?: string;
  tags?: string[];
}


/**
 * Represents a document stored in the system.
 */
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  uploadedBy: { id: string; name: string; role: UserRole };
  uploadDate: string;
  metadata: DocumentMetadata;
  status: DocumentStatus;
  fileUrl: string;
  fileSize: number;
  fileMimeType: string;
  version: number;
  isArchived: boolean;
  sharedWith: { id: string, name: string }[];
}


/**
 * Represents a print request associated with a document.
 */
export interface PrintRequest {
  id: string;
  documentId: string;
  documentName: string;
  requestedBy: { id: string; name: string };
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Printed';
  copies: number;
  paperSize: string;
  deadline?: string;
  approvedBy?: { id: string; name: string };
  approvalDate?: string;
  printedBy?: { id: string; name: string };
  printedDate?: string;
  comments?: string;
}

/**
 * Represents filters for querying documents.
 */
export interface DocumentFilters {
    type?: DocumentType;
    department?: string;
    status?: DocumentStatus;
    uploaderId?: string;
    isArchived?: boolean;
    searchQuery?: string;
}

/**
 * Represents an entry in the document's audit log.
 */
export interface AuditLogEntry {
    id?: string; // Optional, might be doc ID
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    details?: string;
}

export type FileIconType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'zip' | 'text' | 'schedule' | 'syllabus' | 'file';


// --- Service Functions ---

/**
 * Uploads a document.
 * TODO: Implement backend logic for file upload and DB record creation.
 */
export async function uploadDocument(
    file: File,
    metadata: DocumentMetadata,
    uploader: { id: string; name: string; role: UserRole },
    type: DocumentType = 'Other',
    sharedWith: { id: string, name: string }[] = []
): Promise<Document | { error: string }> {
    console.log(`Uploading document: ${file.name} by ${uploader.name}`);
    return { error: "Backend not implemented." };
}

/**
 * Retrieves documents based on filters and user permissions.
 * TODO: Implement backend logic for fetching documents.
 */
export async function getDocuments(filters?: DocumentFilters, currentUser?: AuthUser | null): Promise<Document[]> {
    console.log("Fetching documents with filters:", filters, "for user:", currentUser?.id);
    return [];
}

/**
 * Retrieves a single document by ID.
 * TODO: Implement backend logic.
 */
export async function getDocumentById(documentId: string): Promise<Document | null> {
    console.log(`Fetching document ${documentId}`);
    return null;
}

/**
 * Updates a document's status or metadata.
 * TODO: Implement backend logic.
 */
export async function updateDocument(documentId: string, updates: Partial<Pick<Document, 'status' | 'metadata' | 'isArchived'>>, user: { id: string; name: string; role: UserRole }): Promise<{ success: boolean; message: string }> {
    console.log(`User ${user.id} updating document ${documentId}:`, updates);
    return { success: false, message: "Backend not implemented." };
}


// --- Print Workflow Functions ---

/**
 * Creates a print request for a document.
 * TODO: Implement backend logic.
 */
export async function requestPrint(
    documentId: string,
    copies: number,
    paperSize: string,
    requester: { id: string; name: string },
    deadline?: string
): Promise<PrintRequest | { error: string }> {
    console.log(`User ${requester.id} requesting print for ${documentId}`);
    return { error: "Backend not implemented." };
}

/**
 * Retrieves print requests based on filters and user role.
 * TODO: Implement backend logic.
 */
export async function getPrintRequests(filters?: Partial<Pick<PrintRequest, 'status'>>, userRole?: UserRole): Promise<PrintRequest[]> {
    console.log("Fetching print requests with filters:", filters, "for role:", userRole);
    return [];
}

/**
 * Approves or rejects a print request.
 * TODO: Implement backend logic.
 */
export async function actionPrintRequest(
    requestId: string,
    action: 'Approve' | 'Reject',
    admin: { id: string; name: string },
    comments?: string
): Promise<{ success: boolean; message: string }> {
     console.log(`Admin ${admin.id} ${action}ing print request ${requestId}`);
     return { success: false, message: "Backend not implemented." };
}

/**
 * Marks a print request as printed.
 * TODO: Implement backend logic.
 */
export async function markAsPrinted(requestId: string, printer: { id: string; name: string }): Promise<{ success: boolean; message: string }> {
     console.log(`Print Cell ${printer.id} marking request ${requestId} as printed`);
     return { success: false, message: "Backend not implemented." };
}

// --- Audit Log Functions ---

/**
 * Retrieves the audit log for a specific document.
 * TODO: Implement backend logic.
 */
export async function getAuditLog(documentId: string, userRole: UserRole): Promise<AuditLogEntry[]> {
     console.log(`Fetching audit log for document ${documentId} for role ${userRole}`);
     return [];
}


// --- Utility ---

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex];
}

export const getFileIconType = (mimeType?: string, docType?: DocumentType): FileIconType => {
    if (docType === 'Schedule' || docType === 'Timetable') return 'schedule';
    if (docType === 'Syllabus') return 'syllabus';
    if (!mimeType) return 'file';
    const lowerMime = mimeType.toLowerCase();
    if (lowerMime.includes('pdf')) return 'pdf';
    if (lowerMime.includes('word') || lowerMime.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'word';
    if (lowerMime.includes('spreadsheet') || lowerMime.includes('excel') || lowerMime.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return 'excel';
    if (lowerMime.includes('presentation') || lowerMime.includes('powerpoint') || lowerMime.includes('vnd.openxmlformats-officedocument.presentationml.presentation')) return 'powerpoint';
    if (lowerMime.startsWith('image/')) return 'image';
    if (lowerMime.includes('zip') || lowerMime.includes('compressed') || lowerMime.includes('x-rar-compressed')) return 'zip';
    if (lowerMime.startsWith('text/')) return 'text';
    return 'file';
}


export const getStatusBadgeVariant = (status: DocumentStatus | PrintRequest['status']): { variant: "default" | "secondary" | "destructive" | "outline", className: string } => {
  switch (status) {
    case 'Uploaded': return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'Pending Approval': return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'Pending': return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' }; 
    case 'Approved for Print': return { variant: 'default', className: 'bg-teal-100 text-teal-800 border-teal-300' }; 
    case 'Approved': return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
    case 'Printing': return { variant: 'secondary', className: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'Printed': return { variant: 'default', className: 'bg-gray-100 text-gray-800 border-gray-300' };
    case 'Archived': return { variant: 'outline', className: 'bg-gray-50 text-gray-500 border-gray-200' };
    case 'Rejected': return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' };
    default: return { variant: 'outline', className: '' };
  }
};
