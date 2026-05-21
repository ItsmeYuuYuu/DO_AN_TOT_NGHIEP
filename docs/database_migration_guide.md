# Database Migration Guide

This project uses Entity Framework Core for Database Migrations.

## Prerequisites
Ensure you have the EF Core CLI tool installed:
```bash
dotnet tool install --global dotnet-ef
```

## Adding a New Migration
When you change the models in `ECommerceBackend.Models` or update `ECommerceContext`:
1. Open terminal in the `BackEnd` folder.
2. Run the command:
```bash
dotnet ef migrations add <MigrationName> --project ECommerceBackend/ECommerceBackend.csproj --startup-project ECommerceBackend/ECommerceBackend.csproj
```

## Updating the Database
To apply pending migrations to your database:
```bash
dotnet ef database update --project ECommerceBackend/ECommerceBackend.csproj --startup-project ECommerceBackend/ECommerceBackend.csproj
```

## First Time Setup / Baseline
Since the project originally used a raw SQL script `ECommerDB.sql` to generate the database, we have created an `InitialCreate` baseline migration.
If you are deploying to a brand new database, simply running `dotnet ef database update` will create all tables.
If your database already has the schema from `ECommerDB.sql` but lacks the EF history table, you can manually insert a record to mark `InitialCreate` as applied:
```sql
CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('202X_InitialCreate', '8.0.0');
```
*(Replace `202X_InitialCreate` with the actual migration timestamp name found in the `Migrations` folder)*.
