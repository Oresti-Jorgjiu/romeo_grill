const fs = require('fs');
const path = require('path');

// Mock data
const mockData = {
  brandTitle: "ROMEO GRILL",
  contactPhone: "0696930010",
  contactAddress: "Korce, Albania",
  contactHours: "09:00 - 23:00",
  whatsappNumber: "0696930010"
};

function isNonEmptyString(value, min = 1, max = 255) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function validateSiteData(data) {
  const siteData = data; 

  const basicFields = [
    ["brandTitle", 0, 100],
    ["brandTitle_en", 0, 100],
    ["brandSub", 0, 150],
    ["heroBadge", 0, 150],
    ["heroTitle", 0, 150],
    ["heroDescription", 0, 1000],
    ["aboutTag", 0, 150],
    ["aboutTitle", 0, 200],
    ["aboutLead", 0, 2000],
    ["aboutDescription", 0, 2000],
    ["contactPhone", 0, 50],
    ["contactAddress", 0, 500],
    ["contactHours", 0, 300],
    ["whatsappNumber", 0, 50],
    ["googleMapsUrl", 0, 2000],
    ["contactInstagram", 0, 200],
    ["contactFacebook", 0, 200]
  ];

  for (const [field, min, max] of basicFields) {
    const val = siteData[field];
    if (val !== undefined && !isNonEmptyString(val, min, max)) {
      return { ok: false, error: `Invalid field: ${field}` };
    }
  }
  return { ok: true };
}

console.log("Test 1 (Valid):", validateSiteData(mockData));
console.log("Test 2 (Empty Phone):", validateSiteData({...mockData, contactPhone: ""}));
console.log("Test 3 (Short Title):", validateSiteData({...mockData, brandTitle: "R"}));
