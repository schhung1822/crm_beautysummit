"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ExportFormat = "csv" | "xlsx";

interface ExportOptions {
  filename?: string;
  format: ExportFormat;
  data: any[];
  headers?: Record<string, string>;
}

/**
 * Format a date to string for export
 */
export function formatDateForExport(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Transform data keys to readable headers
 */
export function transformDataForExport(data: any[], headers?: Record<string, string>): any[] {
  if (!headers) return data;

  return data.map((row) => {
    const transformed: any = {};
    Object.keys(headers).forEach((key) => {
      const value = row[key];
      // Format dates if the value is a Date object
      if (value instanceof Date) {
        transformed[headers[key]] = formatDateForExport(value);
      } else if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Check if it looks like an ISO date string
        transformed[headers[key]] = formatDateForExport(value);
      } else {
        transformed[headers[key]] = value ?? "";
      }
    });
    return transformed;
  });
}

/**
 * Export data to CSV format
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename = "export", data, headers } = options;

  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Transform data with headers
  const transformedData = transformDataForExport(data, headers);

  // Convert to CSV
  const csv = Papa.unparse(transformedData, {
    quotes: true,
    delimiter: ",",
    header: true,
  });

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

  // Download file
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to XLSX format
 */
export function exportToXLSX(options: ExportOptions): void {
  const { filename = "export", data, headers } = options;

  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Transform data with headers
  const transformedData = transformDataForExport(data, headers);

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Auto-size columns
  const maxWidth = 50;
  const colWidths: number[] = [];

  if (transformedData.length > 0) {
    Object.keys(transformedData[0]).forEach((key, index) => {
      const maxLength = Math.max(key.length, ...transformedData.map((row) => String(row[key] || "").length));
      colWidths[index] = Math.min(maxLength + 2, maxWidth);
    });

    worksheet["!cols"] = colWidths.map((width) => ({ width }));
  }

  // Write and download file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Main export function that delegates to CSV or XLSX
 */
export function exportData(options: ExportOptions): void {
  const { format } = options;

  switch (format) {
    case "csv":
      exportToCSV(options);
      break;
    case "xlsx":
      exportToXLSX(options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Filter data by date range
 */
export function filterDataByDateRange<T extends Record<string, any>>(
  data: T[],
  dateField: keyof T,
  dateRange: { from?: Date; to?: Date },
): T[] {
  const { from, to } = dateRange;

  if (!from && !to) return data;

  return data.filter((item) => {
    const itemDate = new Date(item[dateField]);

    if (isNaN(itemDate.getTime())) return true; // Include if date is invalid

    if (from && itemDate < from) return false;
    if (to) {
      // Include the entire end date (23:59:59)
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (itemDate > endOfDay) return false;
    }

    return true;
  });
}
