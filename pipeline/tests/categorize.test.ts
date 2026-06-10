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

  it("falls back to other instead of guessing", () => {
    expect(categorizeFunction("Area Manager (Cagayan De Oro)")).toBe("other");
    expect(categorizeFunction("Barista")).toBe("other");
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
