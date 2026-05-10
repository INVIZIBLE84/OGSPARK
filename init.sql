-- Create the main schemas for each department
CREATE SCHEMA IF NOT EXISTS bvoc;
CREATE SCHEMA IF NOT EXISTS cse;
CREATE SCHEMA IF NOT EXISTS it;
CREATE SCHEMA IF NOT EXISTS mech;
CREATE SCHEMA IF NOT EXISTS entc;
CREATE SCHEMA IF NOT EXISTS mba;
CREATE SCHEMA IF NOT EXISTS admin; -- For shared/admin tables

-- Function to create tables within a given schema
CREATE OR REPLACE FUNCTION create_department_tables(schema_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('
        -- Students Table
        CREATE TABLE IF NOT EXISTS %I.students (
            student_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            roll_no VARCHAR(255) UNIQUE,
            email VARCHAR(255) UNIQUE NOT NULL,
            firebase_uid VARCHAR(255) UNIQUE, -- To link with Firebase Auth
            attendance JSONB, -- Flexible for storing attendance data
            fees JSONB, -- Flexible for fee structure and payments
            performance JSONB, -- Flexible for grades, reports
            clearance JSONB, -- Flexible for clearance status
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Faculty Table
        CREATE TABLE IF NOT EXISTS %I.faculty (
            faculty_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            firebase_uid VARCHAR(255) UNIQUE, -- To link with Firebase Auth
            department VARCHAR(255),
            subjects TEXT[], -- Array of subject codes or names
            access_controls JSONB, -- For specific permissions
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Notices Table
        CREATE TABLE IF NOT EXISTS %I.notices (
            notice_id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            issued_by VARCHAR(255),
            issued_at TIMESTAMPTZ DEFAULT NOW(),
            expiry_date DATE,
            target_roles TEXT[] -- e.g., {''student'', ''faculty''}
        );

        -- Reports Table
        CREATE TABLE IF NOT EXISTS %I.reports (
            report_id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            generated_by VARCHAR(255),
            generated_at TIMESTAMPTZ DEFAULT NOW(),
            data JSONB, -- The actual report data
            report_type VARCHAR(100)
        );
    ', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Create tables for each department schema
SELECT create_department_tables('bvoc');
SELECT create_department_tables('cse');
SELECT create_department_tables('it');
SELECT create_department_tables('mech');
SELECT create_department_tables('entc');
SELECT create_department_tables('mba');

-- Create a shared table for admin users
CREATE TABLE IF NOT EXISTS admin.users (
    admin_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- You can add initial data here if needed, for example an initial admin user
-- INSERT INTO admin.users (admin_id, name, email, role) VALUES (''admin001'', ''Admin User'', ''admin@spark.edu'', ''super_admin'');

-- Set search path for easier querying, so you dont have to prefix with schema names
-- This is optional and depends on your connection strategy
-- ALTER DATABASE sparkdb SET search_path TO "$user", public, cse, it, mech, entc, bvoc, mba;
