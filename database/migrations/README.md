# Database migrations

Place versioned PostgreSQL migrations here when persistence work begins. Use one transaction for stock reservations, NGO capacity changes, and the corresponding audit event. Keep original batch quantities and distinguish pickup, verified receipt, and final distribution.

The initial UI runs independently of PostgreSQL.
