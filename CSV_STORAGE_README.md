# CSV Storage System

This system has been converted from in-memory storage to CSV file-based storage for better data persistence and portability.

## Overview

The CSV storage system stores all application data in CSV files within the `data/` directory. This provides:

- **Data Persistence**: Data survives application restarts
- **Portability**: Easy to backup, transfer, or migrate data
- **Human Readable**: CSV files can be opened in Excel or text editors
- **Version Control Friendly**: CSV files can be tracked in git (if needed)

## File Structure

```
data/
├── users.csv              # User accounts and authentication
├── partners.csv           # Partner/merchant information
├── leads.csv             # Lead management data
├── status-hierarchy.csv  # Lead status workflow definitions
└── activity-logs.csv     # System activity tracking
```

## CSV File Schemas

### users.csv
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique user identifier |
| username | string | Login username |
| passwordHash | string | Bcrypt hashed password |
| role | string | User role (Admin/Manager/Customer success officer/Analyst/Operations) |
| email | string | User email address |
| phone | string | User phone number |

### partners.csv
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique partner identifier |
| name | string | Partner display name |
| businessName | string | Legal business name |
| contactPerson | string | Primary contact person |
| email | string | Contact email |
| phone | string | Contact phone |
| companyDetails | string | Company description |
| businessType | string | Type of business |
| gstNumber | string | GST registration number |
| panNumber | string | PAN number |
| status | string | Partner status (Active/Inactive) |
| registrationDate | string | ISO date string |
| type | string | Service type (Grant/Equity/Both) |
| equityLink | string | Equity submission link |
| grantLink | string | Grant submission link |
| qrEquity | string | Equity QR code identifier |
| qrGrant | string | Grant QR code identifier |

### leads.csv
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique lead identifier |
| createdOnDate | string | ISO date string |
| companyName | string | Company name |
| founderName | string | Founder's name |
| ownerName | string | Owner's name |
| contact | string | Contact information |
| email | string | Email address |
| phone | string | Phone number |
| deliveryType | string | Delivery type (Grant/Equity) |
| serviceType | string | Service type (Grant/Equity) |
| formDataJSON | string | JSON string of form data |
| lastStatus | string | Previous status |
| lastStatusUpdatedDate | string | ISO date string |
| currentStatus | string | Current lead status |
| PartnerId | string | Associated partner ID |
| createdByUserId | string | User who created the lead |

### status-hierarchy.csv
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique status identifier |
| statusName | string | Status name |
| nextStatuses | string | Semicolon-separated next possible statuses |
| daysLimit | number | Days limit for auto-move (optional) |
| autoMoveTo | string | Auto-move target status (optional) |

### activity-logs.csv
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique log identifier |
| timestamp | string | ISO date string |
| userId | string | User who performed the action |
| action | string | Action performed |
| entity | string | Entity type affected |
| entityId | string | ID of affected entity |
| details | string | Detailed description |

## Features

### Automatic Data Initialization
- Creates default admin user (admin/admin123)
- Creates sample manager and partner users
- Initializes sample partners and leads
- Sets up complete status hierarchy workflow

### Data Persistence
- All CRUD operations automatically save to CSV files
- Data is loaded on application startup
- Changes are immediately persisted to disk

### Error Handling
- Graceful handling of missing CSV files
- Automatic creation of data directory
- Fallback to empty arrays if files are corrupted

### Performance Considerations
- Data is kept in memory for fast access
- CSV files are only written when data changes
- Efficient CSV parsing and writing

## Usage

### Starting the Application
```bash
npm run dev
```

The system will automatically:
1. Create the `data/` directory if it doesn't exist
2. Load existing CSV data or create initial data
3. Start the application with persistent storage

### Data Backup
To backup your data, simply copy the `data/` directory:
```bash
cp -r data/ backup-data/
```

### Data Migration
To migrate data from another system:
1. Create CSV files in the `data/` directory
2. Follow the schema defined above
3. Restart the application

### Manual Data Editing
You can manually edit CSV files using:
- Excel or Google Sheets
- Text editors (be careful with formatting)
- CSV-specific tools

**Note**: Always backup your data before manual editing!

## Security Considerations

- CSV files contain sensitive data (password hashes, contact info)
- The `data/` directory is excluded from version control
- Consider encrypting sensitive CSV files in production
- Implement proper file permissions on the data directory

## Troubleshooting

### Missing Data Directory
If the `data/` directory is missing, the system will create it automatically.

### Corrupted CSV Files
If CSV files become corrupted:
1. Stop the application
2. Delete the corrupted file(s)
3. Restart the application (will recreate with default data)

### Permission Issues
Ensure the application has read/write permissions to the `data/` directory.

## Migration from In-Memory Storage

The system automatically migrates from in-memory to CSV storage:
1. Old in-memory data is preserved during the first run
2. Data is automatically saved to CSV files
3. Subsequent runs use CSV storage exclusively

## API Compatibility

The CSV storage system maintains full API compatibility with the previous in-memory system. No changes are required to:
- Frontend application code
- API endpoints
- Database queries
- Authentication system 