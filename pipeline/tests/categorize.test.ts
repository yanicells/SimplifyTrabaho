import { describe, expect, it } from "vitest";
import { categorize, categorizeLevel, categorizeFunction } from "../src/categorize.js";

describe("categorizeLevel", () => {
  it("detects internships, including PH terms", () => {
    expect(categorizeLevel("Software Engineering Intern")).toBe("internship");
    expect(categorizeLevel("Internship Program - Marketing")).toBe("internship");
    expect(categorizeLevel("OJT - Accounting Department")).toBe("internship");
    expect(categorizeLevel("On-the-Job Trainee")).toBe("internship");
    expect(categorizeLevel("Practicum Student")).toBe("internship");
    expect(categorizeLevel("Apprentice Technician")).toBe("internship");
  });

  it("detects entry level, including PH terms", () => {
    expect(categorizeLevel("Junior Accountant")).toBe("entry");
    expect(categorizeLevel("Jr. Software Developer")).toBe("entry");
    expect(categorizeLevel("Entry-Level Analyst")).toBe("entry");
    expect(categorizeLevel("Fresh Grad Hiring - Operations")).toBe("entry");
    expect(categorizeLevel("Management Trainee")).toBe("entry");
    expect(categorizeLevel("Cadet Engineering Program")).toBe("entry");
    expect(categorizeLevel("Financial Operations Associate (Recons)")).toBe("entry");
  });

  it("treats internship markers as stronger than entry markers", () => {
    expect(categorizeLevel("Fresh Grad Internship")).toBe("internship");
  });

  it("does not treat Senior Associate as entry", () => {
    expect(categorizeLevel("Senior Associate")).toBe("senior");
    expect(categorizeLevel("Sr. Associate, Tax")).toBe("senior");
  });

  it("detects senior level", () => {
    expect(categorizeLevel("Senior Software Engineer")).toBe("senior");
    expect(categorizeLevel("Sr Backend Engineer")).toBe("senior");
    expect(categorizeLevel("Engineering Lead")).toBe("senior");
    expect(categorizeLevel("Principal Architect")).toBe("senior");
    expect(categorizeLevel("Staff Software Engineer")).toBe("senior");
    expect(categorizeLevel("Head of Design")).toBe("senior");
    expect(categorizeLevel("Account Manager")).toBe("senior");
    expect(categorizeLevel("Director of Operations")).toBe("senior");
    expect(categorizeLevel("VP, Finance")).toBe("senior");
    expect(categorizeLevel("Chief Financial Officer")).toBe("senior");
  });

  it("does not treat bare 'Officer' titles as senior (PH staff-level convention)", () => {
    // "officer" in SPEC §9 means C-level; PH titles like "HR Officer" are staff roles.
    expect(categorizeLevel("HR Officer")).toBe("unknown");
    expect(categorizeLevel("Customer Service Officer")).toBe("unknown");
  });

  it("treats supervisors and team leaders as senior (PH BPO convention)", () => {
    expect(categorizeLevel("Accounts Payable Supervisor")).toBe("senior");
    expect(categorizeLevel("Swine Farm Supervisor (Stay-In Set Up)")).toBe("senior");
    expect(categorizeLevel("Team Leader")).toBe("senior");
    expect(categorizeLevel("Customer Service Team Leader")).toBe("senior");
  });

  it("does not treat 'Leadership' program titles as senior", () => {
    expect(categorizeLevel("Leadership Development Program")).toBe("unknown");
  });

  it("treats BPO frontline rep titles as entry (CSR/TSR/SDR)", () => {
    expect(categorizeLevel("Customer Service Representative")).toBe("entry");
    expect(categorizeLevel("CSR (Voice)")).toBe("entry");
    expect(categorizeLevel("Technical Support Representative")).toBe("entry");
    expect(categorizeLevel("Customer Support Representative")).toBe("entry");
    expect(categorizeLevel("Sales Development Representative (SDR)")).toBe("entry");
  });

  it("ranks explicit seniority above frontline rep markers", () => {
    expect(categorizeLevel("Senior Customer Service Representative")).toBe("senior");
    expect(categorizeLevel("Customer Service Representative II")).toBe("mid");
  });

  it("detects mid level only from explicit markers", () => {
    expect(categorizeLevel("Mid-Level Designer")).toBe("mid");
    expect(categorizeLevel("Intermediate Developer")).toBe("mid");
    expect(categorizeLevel("Software Engineer II")).toBe("mid");
    expect(categorizeLevel("Software Engineer III")).toBe("mid");
  });

  it("defaults to unknown, never assumes mid", () => {
    expect(categorizeLevel("Software Engineer")).toBe("unknown");
    expect(categorizeLevel("Risk Operations Analyst")).toBe("unknown");
  });
});

describe("categorizeFunction", () => {
  it("maps titles to functions", () => {
    expect(categorizeFunction("Software Engineer")).toBe("engineering");
    expect(categorizeFunction("Backend Developer")).toBe("engineering");
    expect(categorizeFunction("QA Tester")).toBe("engineering");
    expect(categorizeFunction("Data Analyst")).toBe("data");
    expect(categorizeFunction("Machine Learning Researcher")).toBe("data");
    expect(categorizeFunction("UX Designer")).toBe("design");
    expect(categorizeFunction("Product Manager")).toBe("product");
    expect(categorizeFunction("SEO Specialist")).toBe("marketing");
    expect(categorizeFunction("Account Executive")).toBe("sales");
    expect(categorizeFunction("Business Development Representative")).toBe("sales");
    expect(categorizeFunction("Treasury Analyst")).toBe("finance");
    expect(categorizeFunction("Talent Acquisition Partner")).toBe("hr");
    expect(categorizeFunction("Supply Chain Coordinator")).toBe("operations");
    expect(categorizeFunction("Customer Success Generalist (Daylight)")).toBe(
      "customer-support",
    );
    expect(categorizeFunction("CSR - Night Shift")).toBe("customer-support");
    expect(categorizeFunction("Compliance Manager")).toBe("legal");
  });

  it("maps PH back-office finance vocabulary to finance", () => {
    expect(categorizeFunction("Bookkeeper")).toBe("finance");
    expect(categorizeFunction("Accounts Payable Specialist")).toBe("finance");
    expect(categorizeFunction("Accounts Receivable Analyst")).toBe("finance");
    expect(categorizeFunction("Billing Specialist")).toBe("finance");
    expect(categorizeFunction("Record To Report Specialist")).toBe("finance");
    expect(categorizeFunction("Procure to Pay Supervisor (AP/Payments)")).toBe("finance");
    expect(categorizeFunction("(FA) Fixed Asset Specialist")).toBe("finance");
    expect(categorizeFunction("Estimator")).toBe("finance");
  });

  it("maps VA/admin and back-office ops vocabulary to operations", () => {
    expect(categorizeFunction("Virtual Assistant")).toBe("operations");
    expect(categorizeFunction("Real Estate Virtual Assistant")).toBe("operations");
    expect(categorizeFunction("Executive Assistant")).toBe("operations");
    expect(categorizeFunction("Warehouse Associate")).toBe("operations");
    expect(categorizeFunction("Workforce Analyst")).toBe("operations");
    expect(categorizeFunction("Purchasing Coordinator")).toBe("operations");
    expect(categorizeFunction("Dispatcher")).toBe("operations");
  });

  it("maps account management to sales", () => {
    expect(categorizeFunction("Account Manager")).toBe("sales");
    expect(categorizeFunction("Technical Account Manager")).toBe("sales");
  });

  it("maps CX vocabulary to customer-support", () => {
    expect(categorizeFunction("Customer Experience Associate")).toBe("customer-support");
    expect(categorizeFunction("Client Success Manager")).toBe("customer-support");
    expect(categorizeFunction("TSR - Day Shift")).toBe("customer-support");
  });

  it("maps IT administration to engineering", () => {
    expect(categorizeFunction("L3 Systems Administrator")).toBe("engineering");
    expect(categorizeFunction("Network Administrator")).toBe("engineering");
  });

  it("maps creative production and ads vocabulary", () => {
    expect(categorizeFunction("Video Editor")).toBe("design");
    expect(categorizeFunction("Paid Ads Specialist")).toBe("marketing");
    expect(categorizeFunction("Copywriter")).toBe("marketing");
    expect(categorizeFunction("Junior CRM Specialist")).toBe("marketing");
  });

  it("maps training/L&D to hr, after earlier rows", () => {
    expect(categorizeFunction("Safety Trainer")).toBe("hr");
    expect(categorizeFunction("Training Associate")).toBe("hr");
    expect(categorizeFunction("Sales Trainer")).toBe("sales");
  });

  it("falls back to other instead of guessing", () => {
    expect(categorizeFunction("Area Manager (Cagayan De Oro)")).toBe("other");
    expect(categorizeFunction("Barista")).toBe("other");
    // Deliberately unmapped: no project-management bucket in the enum.
    expect(categorizeFunction("Project Manager")).toBe("other");
    expect(categorizeFunction("GBS Specialist")).toBe("other");
  });

  it("checks the table in SPEC §9 order — engineering before data", () => {
    expect(categorizeFunction("Data Engineer")).toBe("engineering");
  });
});

describe("categorize", () => {
  it("returns level and function together", () => {
    expect(categorize("Employee Relations Intern")).toEqual({
      level: "internship",
      function: "hr",
    });
  });
});
