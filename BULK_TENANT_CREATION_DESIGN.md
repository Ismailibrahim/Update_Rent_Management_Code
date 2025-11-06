# Bulk Tenant Creation - Design & Implementation Plan

## Requirements Analysis

### Use Case
- Create multiple tenants at once for pre-installations
- Tenants created without rental unit assignments initially
- Later attach tenants to rental units when ready

### Key Considerations

#### ✅ Advantages of Bulk Creation
1. **Time Efficiency**: Create 10+ tenants in seconds vs minutes
2. **Pre-installation Workflow**: Set up tenant profiles before units are ready
3. **Batch Processing**: Handle large migrations easily
4. **Consistency**: Same validation and data structure for all tenants

#### ⚠️ Potential Drawbacks & Solutions

1. **Data Validation Complexity**
   - **Issue**: Hard to validate bulk data, errors may go unnoticed
   - **Solution**: 
     - Preview/validation before creation
     - Row-by-row error reporting
     - Skip errors option with detailed log

2. **Duplicate Detection**
   - **Issue**: Creating duplicate tenants (same email/phone/national_id)
   - **Solution**:
     - Pre-check for duplicates before creation
     - Show warnings for potential duplicates
     - Option to skip or update existing

3. **Performance Impact**
   - **Issue**: Creating 100+ tenants could slow down the system
   - **Solution**:
     - Batch processing (chunks of 50)
     - Transaction rollback on critical errors
     - Progress indicator
     - Background job option for large batches

4. **Error Handling**
   - **Issue**: One bad row could fail entire batch
   - **Solution**:
     - Per-row error handling
     - Continue on non-critical errors
     - Detailed error report with row numbers
     - Partial success reporting

5. **Missing Required Fields**
   - **Issue**: Bulk data might have missing required fields
   - **Solution**:
     - Clear validation rules per tenant type
     - Highlight missing required fields
     - Default values for optional fields

6. **Data Quality**
   - **Issue**: Inconsistent data formats (dates, phone numbers, emails)
   - **Solution**:
     - Data normalization/formatting
     - Format validation (email, phone, date)
     - Auto-formatting where possible

7. **User Experience**
   - **Issue**: Long form overwhelming for bulk entry
   - **Solution**:
     - CSV/Excel import option (easiest)
     - Table-based manual entry
     - Template download
     - Import preview

## Implementation Options

### Option 1: CSV/Excel Import (RECOMMENDED)
**Pros:**
- Most familiar to users
- Easy to prepare data in Excel
- Can handle large datasets
- Template with examples

**Cons:**
- Requires file upload
- Need to handle different formats

**Implementation:**
- Download template (CSV/Excel)
- Upload file with tenant data
- Preview and validate
- Create tenants with error reporting

### Option 2: Manual Bulk Entry (Table Form)
**Pros:**
- No file needed
- Immediate validation
- Good for small batches (5-10)

**Cons:**
- Tedious for large batches
- More prone to errors
- Slower than import

**Implementation:**
- Dynamic table with add/remove rows
- Inline validation
- Real-time error feedback

### Option 3: Hybrid Approach (BEST)
**Combine both:**
- CSV/Excel import for large batches
- Manual entry for small batches
- Template download for reference

## Recommended Implementation

### Phase 1: Backend API (Bulk Tenant Creation)

**Endpoint**: `POST /api/tenants/bulk`

**Request Structure:**
```json
{
  "tenants": [
    {
      "tenant_type": "individual",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+9601234567",
      // ... other fields
      "rental_unit_ids": [] // Empty for pre-installation
    }
  ],
  "options": {
    "skip_duplicates": false,
    "skip_errors": false,
    "validate_only": false
  }
}
```

**Response Structure:**
```json
{
  "success": 8,
  "failed": 2,
  "skipped": 1,
  "tenants": [...],
  "errors": [
    {
      "row": 3,
      "data": {...},
      "error": "Email already exists"
    }
  ]
}
```

**Features:**
- Batch processing (chunks of 50)
- Transaction support
- Duplicate detection
- Detailed error reporting
- Validation before creation

### Phase 2: Frontend Page

**Location**: `/settings/bulk-tenants`

**Features:**
1. **Import Tab**
   - Download template button
   - File upload (CSV/Excel)
   - Preview table
   - Validation summary
   - Create button

2. **Manual Entry Tab**
   - Dynamic table with add/remove rows
   - Inline validation
   - Copy row functionality
   - Bulk actions

3. **Results/Summary**
   - Success count
   - Error report
   - Download error log
   - View created tenants

### Phase 3: Template & Validation

**CSV Template Columns:**
```
tenant_type,first_name,last_name,email,phone,national_id,nationality,gender,date_of_birth,address,city,postal_code,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,employment_company,employment_position,employment_salary,employment_phone,bank_name,account_number,account_holder_name,status,notes,company_name,company_address,company_registration_number,company_gst_tin,company_telephone,company_email
```

**Validation Rules:**
- Individual: first_name, last_name, email, phone required
- Company: company_name, company_address, company_registration_number, company_telephone, company_email required
- Email format validation
- Phone format normalization
- Date format validation
- Duplicate check (email, phone, national_id)

## Alternative Approaches Considered

### Alternative 1: Tenant Groups/Pre-registration
**Concept**: Create "tenant groups" or "pre-registrations" that convert to tenants later
- **Pros**: Cleaner separation, no partial tenants
- **Cons**: More complex, requires additional table/model

### Alternative 2: Import with Rental Unit Assignment
**Concept**: Allow bulk import with rental unit assignments
- **Pros**: One-step process
- **Cons**: More complex validation, requires all units to be available

### Alternative 3: Draft Tenants
**Concept**: Create "draft" tenants that can be completed later
- **Pros**: Flexible, allows partial data
- **Cons**: Requires status field, more UI complexity

## Recommended Approach

**Hybrid Solution:**
1. Bulk tenant creation WITHOUT rental units (pre-installation)
2. CSV/Excel import + Manual entry options
3. Later attach to rental units via existing tenant edit page
4. Clear validation and error reporting
5. Progress tracking for large batches

**Why this approach:**
- Matches the use case (pre-installation)
- Flexible (can add rental units later)
- User-friendly (CSV import is familiar)
- Safe (validation and error handling)
- Scalable (handles small and large batches)

## Security Considerations

1. **File Upload Security**
   - Validate file types (CSV, XLS, XLSX only)
   - File size limits (5MB max)
   - Sanitize file contents
   - Virus scanning (if available)

2. **Data Validation**
   - Server-side validation (never trust client)
   - SQL injection prevention (Laravel's built-in)
   - XSS prevention for imported data

3. **Rate Limiting**
   - Limit bulk operations per user
   - Prevent abuse of bulk creation

4. **Audit Logging**
   - Log all bulk operations
   - Track who created what and when

## Performance Considerations

1. **Batch Size**
   - Process in chunks of 50 tenants
   - Use database transactions
   - Show progress indicator

2. **Database Optimization**
   - Use bulk inserts where possible
   - Index on email, phone, national_id for duplicate checks
   - Eager loading for relationships

3. **Memory Management**
   - Stream large CSV files
   - Process row by row for large files
   - Clear memory after processing

4. **Background Jobs** (Future)
   - For very large batches (500+)
   - Queue job for async processing
   - Email notification on completion

## Testing Strategy

1. **Unit Tests**
   - Validation rules
   - Duplicate detection
   - Error handling

2. **Integration Tests**
   - Full import flow
   - Error scenarios
   - Edge cases

3. **User Acceptance Testing**
   - Small batch (5 tenants)
   - Medium batch (50 tenants)
   - Large batch (200 tenants)
   - Error scenarios
   - Different data formats

## Implementation Plan

### Step 1: Backend API
- [ ] Create bulk creation endpoint
- [ ] Add validation logic
- [ ] Implement duplicate detection
- [ ] Add error reporting
- [ ] Write tests

### Step 2: Frontend Page
- [ ] Create settings page route
- [ ] Build import interface
- [ ] Build manual entry interface
- [ ] Add template download
- [ ] Add preview/validation
- [ ] Add results display

### Step 3: Integration
- [ ] Connect frontend to backend
- [ ] Add error handling
- [ ] Add progress indicators
- [ ] Test end-to-end

### Step 4: Documentation
- [ ] User guide
- [ ] Template documentation
- [ ] Error handling guide

