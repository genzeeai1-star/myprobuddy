# Lead Management Features

This document describes the new features added to the Lead Management System.

## 🎯 Features Implemented

### 1. Lead Assignment
- **Description**: Every lead can now be assigned to a specific user for follow-up and management
- **Implementation**: 
  - Added `assignedToUserId` field to the lead schema
  - New API endpoint: `PUT /api/leads/:leadId/assign`
  - UI shows assigned user with avatar and username
  - Unassigned leads show "Unassigned" status
  - Assignment button in actions column

### 2. Advanced Search & Filtering
- **Description**: Comprehensive search and filtering capabilities for leads
- **Features**:
  - **Search**: Search by company name, founder name, email, or contact
  - **Status Filter**: Filter by lead status (New Lead, RNR, Call Back, etc.)
  - **Service Type Filter**: Filter by Grant or Equity
  - **Assigned User Filter**: Filter by assigned user or show unassigned leads
  - **Date Range Filter**: Filter by creation date range
  - **Active Filters Display**: Shows active filters with ability to remove individual filters
  - **Clear All Filters**: One-click to clear all applied filters

### 3. Bulk Upload
- **Description**: Upload multiple leads at once using CSV format
- **Features**:
  - **CSV Template**: Downloadable template with required fields
  - **Validation**: Server-side validation of required fields
  - **Error Handling**: Detailed error messages for failed uploads
  - **Batch Processing**: Process multiple leads in a single request
  - **User Assignment**: Can assign leads to users during upload

## 📋 API Endpoints

### New Endpoints

#### 1. Assign Lead
```http
PUT /api/leads/:leadId/assign
Content-Type: application/json

{
  "assignedToUserId": "user-id-here"
}
```

#### 2. Bulk Upload
```http
POST /api/leads/bulk-upload
Content-Type: application/json

{
  "leads": [
    {
      "companyName": "Company Name",
      "founderName": "Founder Name",
      "contact": "+1234567890",
      "email": "email@company.com",
      "phone": "+1234567890",
      "serviceType": "Grant",
      "assignedToUserId": "user-id-optional"
    }
  ]
}
```

#### 3. Filter Leads
```http
GET /api/leads/filter?search=term&status=New Lead&serviceType=Grant&assignedToUserId=user-id&dateFrom=2024-01-01&dateTo=2024-12-31&page=1&limit=50
```

## 🗄️ Database Schema Changes

### Lead Schema Updates
```typescript
export const leadSchema = z.object({
  // ... existing fields ...
  assignedToUserId: z.string().optional(), // New field for lead assignment
});
```

### Bulk Upload Schema
```typescript
export const bulkUploadSchema = z.object({
  leads: z.array(z.object({
    companyName: z.string(),
    founderName: z.string(),
    contact: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    serviceType: z.enum(["Grant", "Equity"]),
    assignedToUserId: z.string().optional(),
  }))
});
```

## 🎨 UI Components

### 1. Search & Filter Bar
- **Location**: Top of leads page
- **Features**:
  - Search input with icon
  - Filter button to open filter dialog
  - Bulk upload button
  - Template download button
  - Active filters display with remove buttons

### 2. Enhanced Leads Table
- **New Column**: "Assigned To" column showing user avatar and name
- **New Action**: Assign button in actions column
- **Visual Indicators**: 
  - Assigned users show colored avatar with initials
  - Unassigned leads show gray avatar with user icon

### 3. Filter Dialog
- **Status Filter**: Dropdown with all available statuses
- **Service Type Filter**: Grant/Equity selection
- **Assigned User Filter**: User dropdown with "Unassigned" option
- **Date Range**: From/To date inputs
- **Clear All**: Button to reset all filters

### 4. Bulk Upload Dialog
- **Instructions**: Clear guidelines for CSV format
- **CSV Input**: Large textarea for pasting CSV data
- **Template Download**: Button to download CSV template
- **Error Display**: Shows validation errors from upload
- **Progress**: Loading state during upload

### 5. Assign Lead Dialog
- **User Selection**: Dropdown with all available users
- **User Display**: Shows username and role
- **Confirmation**: Clear assignment process

## 📊 Pagination

- **Page Size**: 50 leads per page
- **Navigation**: Previous/Next buttons with page numbers
- **Info Display**: Shows current range and total count
- **Responsive**: Works on all screen sizes

## 🔧 Technical Implementation

### Frontend Changes
1. **State Management**: Added filter states and dialog states
2. **Query Parameters**: Dynamic query building for filters
3. **Mutations**: New mutations for assignment and bulk upload
4. **UI Components**: New dialogs and enhanced table

### Backend Changes
1. **Schema Updates**: Added assignedToUserId field
2. **Storage Updates**: Updated CSV storage to handle new field
3. **API Endpoints**: New endpoints for assignment, bulk upload, and filtering
4. **Validation**: Server-side validation for bulk uploads

### Database Changes
1. **CSV Structure**: Updated leads.csv to include assignedToUserId column
2. **Migration**: Existing leads will have null assignedToUserId
3. **Indexing**: Efficient filtering and search capabilities

## 🚀 Usage Instructions

### Assigning a Lead
1. Click the "Assign" button (user icon) in the actions column
2. Select a user from the dropdown
3. Click "Assign" to confirm

### Filtering Leads
1. Use the search bar for quick text search
2. Click "Filters" button for advanced filtering
3. Select desired filters in the dialog
4. Click "Apply Filters" to see results
5. Use "Clear All" to reset filters

### Bulk Upload
1. Click "Bulk Upload" button
2. Download the template to see required format
3. Prepare your CSV data with headers
4. Paste CSV data into the textarea
5. Click "Upload Leads" to process
6. Review any errors and fix if needed

### Download Template
1. Click "Template" button in the search bar
2. CSV file will download with example data
3. Use as a starting point for your bulk upload

## 🧪 Testing

Use the provided test file `test-lead-features.js` to verify functionality:

```javascript
// In browser console
testLeadFeatures();
```

This will test:
- Bulk upload functionality
- Lead filtering
- User retrieval
- Lead assignment

## 🔒 Security & Permissions

- **Lead Assignment**: Admin and Manager roles only
- **Bulk Upload**: Admin and Manager roles only
- **Filtering**: All authenticated users can filter leads
- **Viewing**: All authenticated users can view leads

## 📈 Performance Considerations

- **Pagination**: Limits data transfer and improves performance
- **Efficient Filtering**: Server-side filtering reduces client load
- **Batch Processing**: Bulk upload processes leads efficiently
- **Caching**: Query caching for better performance

## 🐛 Known Issues & Limitations

1. **CSV Format**: Must include headers and follow exact format
2. **User IDs**: assignedToUserId must be valid user IDs from the system
3. **Date Format**: Date filters use ISO date format (YYYY-MM-DD)
4. **Search**: Case-insensitive search across multiple fields

## 🔄 Future Enhancements

1. **Excel Import**: Support for .xlsx files
2. **Advanced Search**: Full-text search with relevance scoring
3. **Bulk Actions**: Bulk assign, status change, delete
4. **Export**: Export filtered results to CSV/Excel
5. **Notifications**: Email notifications for assigned leads
6. **Analytics**: Lead assignment analytics and reporting
