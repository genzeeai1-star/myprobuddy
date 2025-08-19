# Lead Status Hierarchy

## Overview
The lead management system uses a hierarchical status workflow that guides leads through different stages from initial contact to final outcome.

## Status Flow Diagram

```
                                    NEW LEAD
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
                RNR (6 days)    Call Back (6 days)   Not Interested
                    │                  │                  │
            ┌───────┴───────┐  ┌───────┴───────┐          │
            │               │  │               │          │
            ▼               ▼  ▼               ▼          ▼
        Interested    Reject - RNR    Interested    Reject - Not Attend   Reject - Not Interested
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
                                       ▼
                                   INTERESTED
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            Reject - Screening    Screening Pass
                   Fail
                                       │
                                       ▼
                              Proposal to be Sent
                                       │
                                       ▼
                                 Proposal Sent
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
              Not Interested    Payment Link Sent   (Final Reject)
                    │                  │
                    ▼                  │
            Reject - Not Interested    │
                                       │
                                       ▼
                              Payment Link Sent
                    │                  │
                    └──────────────────┼──────────────────┐
                                       │                  │
                                       ▼                  ▼
                                   Not Paid           Paid
                                       │                  │
                                       ▼                  ▼
                            Reject - Payment Not Done   To Apply
                                                              │
                                                              ▼
                                                            Applied
                                                              │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
                Rejected           Approved          Final Reject
                    │                  │
                    ▼                  │
              Final Reject             │
                                       │
                                       ▼
                                   APPROVED
```

## Status Definitions

### Initial Status
- **New Lead**: Starting point for all new leads

### Early Engagement Statuses
- **RNR (Ring No Response)**: Lead didn't respond to initial contact (can transition to Interested within 6 days, or auto-reject after 6 days)
- **Call Back**: Lead requested a callback (can transition to Interested within 6 days, or auto-reject after 6 days)
- **Not Interested**: Lead expressed disinterest
- **Interested**: Lead showed interest in proceeding

### Screening Statuses
- **Interested**: Lead showed interest and is being evaluated
- **Screening Pass**: Lead passed initial screening
- **Reject - Screening Fail**: Lead failed screening criteria

### Proposal Statuses
- **Proposal to be Sent**: Ready to send proposal
- **Proposal Sent**: Proposal has been sent to lead

### Payment Statuses
- **Payment Link Sent**: Payment link sent to lead
- **Not Paid**: Lead hasn't made payment
- **Paid**: Lead has completed payment

### Application Statuses
- **To Apply**: Ready to apply for service
- **Applied**: Application has been submitted

### Final Statuses
- **Approved**: Lead's application approved
- **Rejected**: Lead's application rejected
- **Final Reject**: Final rejection (end state)

### Rejection Statuses (End States)
- **Reject - RNR**: Rejected due to no response
- **Reject - Not Attend**: Rejected due to no attendance
- **Reject - Not Interested**: Rejected due to lack of interest
- **Reject - Screening Fail**: Rejected due to screening failure
- **Reject - Payment Not Done**: Rejected due to non-payment

## Automatic Transitions

### Time-based Auto-moves
- **RNR** → **Reject - RNR** (after 6 days)
- **Call Back** → **Reject - Not Attend** (after 6 days)

### Manual Transitions
All other status changes require manual intervention by Admin or Manager users.

## Rules & Constraints

1. **Hierarchical Validation**: Only allowed transitions per the hierarchy
2. **Role-based Access**: Only Admin and Manager can change statuses
3. **Activity Logging**: All status changes are logged with user and timestamp
4. **Auto-processing**: Daily automatic status processing for time-based transitions
5. **Final States**: Rejection statuses are end states with no further transitions

## Status Colors (UI)

- **New Lead**: Blue
- **Screening**: Orange/Amber
- **Interested**: Purple
- **Screening Pass**: Light Gray
- **Approved**: Green
- **Rejected**: Red
- **Payment-related**: Indigo/Blue
- **Proposal-related**: Purple/Indigo
