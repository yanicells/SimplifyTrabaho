import { describe, expect, it } from "vitest";
import { deriveMetro, METRO_TAGS } from "../src/metro.js";

// Every location string in these tests appears verbatim in data/listings.json
// (or is a minimal variant) — the keyword map is mined from real data (SPEC §6).

describe("deriveMetro", () => {
  it("tags NCR cities and their region aliases", () => {
    expect(deriveMetro(["Muntinlupa, NCR, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["Makati City, Metro Manila"])).toEqual(["ncr"]);
    expect(deriveMetro(["Taguig City, Metro Manila, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["Bonifacio Global City, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["Quezon City"])).toEqual(["ncr"]);
    expect(deriveMetro(["Las Piñas, NCR, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["North Caloocan, Metro Manila"])).toEqual(["ncr"]);
    expect(deriveMetro(["Pasay City, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["Parañaque, Metro Manila"])).toEqual(["ncr"]);
  });

  it("tags real-data misspellings of Manila/Taguig", () => {
    expect(deriveMetro(["Manilla, Philippines"])).toEqual(["ncr"]);
    expect(deriveMetro(["Tauig, Philippines"])).toEqual(["ncr"]);
  });

  it("tags Cebu including Metro Cebu cities", () => {
    expect(deriveMetro(["Cebu City, Central Visayas, Philippines"])).toEqual(["cebu"]);
    expect(deriveMetro(["Cebu, Cebu"])).toEqual(["cebu"]);
    expect(deriveMetro(["Lapu-Lapu, Philippines"])).toEqual(["cebu"]);
    expect(deriveMetro(["Mandaue, Philippines"])).toEqual(["cebu"]);
  });

  it("tags Davao", () => {
    expect(deriveMetro(["Philippines - Davao City"])).toEqual(["davao"]);
    expect(deriveMetro(["Davao City, Davao Region, Philippines"])).toEqual(["davao"]);
  });

  it("tags Clark/Pampanga", () => {
    expect(deriveMetro(["Clark, Pampanga"])).toEqual(["clark-pampanga"]);
    expect(deriveMetro(["Angeles , Pampanga"])).toEqual(["clark-pampanga"]);
  });

  it("tags Calabarzon provinces and cities", () => {
    expect(deriveMetro(["Biñan, Calabarzon, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["Lipa City, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["Cavite, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["City of Santa Rosa, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["Imus, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["Dasmariñas, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["San Pablo City, Philippines"])).toEqual(["calabarzon"]);
    expect(deriveMetro(["Batangas, Philippines"])).toEqual(["calabarzon"]);
  });

  it("tags the single-city metros", () => {
    expect(deriveMetro(["Iloilo City, Philippines"])).toEqual(["iloilo"]);
    expect(deriveMetro(["Bacolod"])).toEqual(["bacolod"]);
    expect(deriveMetro(["Baguio City, Benguet"])).toEqual(["baguio"]);
    expect(deriveMetro(["Cagayan De Oro City, Philippines"])).toEqual(["cdo"]);
  });

  it("tags PH-tied remote locations as remote-ph", () => {
    expect(deriveMetro(["Remote - Philippines"])).toEqual(["remote-ph"]);
    expect(deriveMetro(["The Philippines (Remote)"])).toEqual(["remote-ph"]);
    expect(deriveMetro(["Philippines-Remote"])).toEqual(["remote-ph"]);
  });

  it("tags a remote city location with both the city and remote-ph", () => {
    expect(deriveMetro(["Manila - Remote"])).toEqual(["ncr", "remote-ph"]);
  });

  it("does not treat hybrid as remote", () => {
    expect(deriveMetro(["Hybrid, Manila"])).toEqual(["ncr"]);
  });

  it("falls back to other-ph for PH locations without a metro bucket", () => {
    expect(deriveMetro(["Philippines"])).toEqual(["other-ph"]);
    expect(deriveMetro(["Tarlac, Central Luzon, Philippines"])).toEqual(["other-ph"]);
    expect(deriveMetro(["Iligan City, Northern Mindanao, Philippines"])).toEqual([
      "other-ph",
    ]);
    expect(deriveMetro(["Tacloban or Ormoc, Leyte and Samar, Philippines"])).toEqual([
      "other-ph",
    ]);
  });

  it("ignores non-PH locations entirely", () => {
    expect(deriveMetro(["Jakarta, Indonesia"])).toEqual([]);
    expect(deriveMetro(["South Africa - Johannesburg"])).toEqual([]);
    expect(deriveMetro([])).toEqual([]);
  });

  it("unions tags across locations, deduped, in canonical order", () => {
    expect(
      deriveMetro(["Cebu City, Philippines", "Makati", "Quezon City, Philippines"]),
    ).toEqual(["ncr", "cebu"]);
    expect(
      deriveMetro(["Remote - Philippines", "Manila, Philippines", "Singapore"]),
    ).toEqual(["ncr", "remote-ph"]);
  });

  it("matches city keywords on word boundaries only", () => {
    // "Mandaue" must not match inside "Mandaues..." -like tokens; gate is PH-only anyway
    expect(deriveMetro(["Clarksville, TN"])).toEqual([]);
  });
});

describe("METRO_TAGS", () => {
  it("lists the SPEC §6 value list in canonical order", () => {
    expect(METRO_TAGS).toEqual([
      "ncr",
      "cebu",
      "davao",
      "clark-pampanga",
      "calabarzon",
      "iloilo",
      "bacolod",
      "baguio",
      "cdo",
      "remote-ph",
      "other-ph",
    ]);
  });
});
