import fs from "fs/promises";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import csvParser from "csv-parser";
import { createReadStream } from "fs";

export class CSVService {
  private dataDir: string;
  private locks = new Map<string, Promise<any>>();

  constructor(dataDirectory = "data") {
    this.dataDir = path.resolve(dataDirectory);
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    return path.join(this.dataDir, `${filename}.csv`);
  }

  private async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Wait for any existing operation on this resource
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new lock for this operation
    const lockPromise = operation();
    this.locks.set(key, lockPromise);

    try {
      const result = await lockPromise;
      return result;
    } finally {
      // Remove the lock when done
      this.locks.delete(key);
    }
  }

  async readCSV<T extends Record<string, any>>(filename: string): Promise<T[]> {
    return this.withLock(`read-${filename}`, async () => {
      const filePath = this.getFilePath(filename);
      
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, return empty array
        return [];
      }

      return new Promise<T[]>((resolve, reject) => {
        const results: T[] = [];
        
        createReadStream(filePath)
          .pipe(csvParser())
          .on("data", (data) => {
            // Convert string values back to appropriate types
            const converted = this.convertTypes(data);
            results.push(converted);
          })
          .on("end", () => resolve(results))
          .on("error", reject);
      });
    });
  }

  async writeCSV<T extends Record<string, any>>(filename: string, data: T[], headers?: string[]): Promise<void> {
    return this.withLock(`write-${filename}`, async () => {
      const filePath = this.getFilePath(filename);
      
      if (data.length === 0) {
        // Write empty file with headers only if provided
        if (headers) {
          const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: headers.map(h => ({ id: h, title: h }))
          });
          await csvWriter.writeRecords([]);
        }
        return;
      }

      // Infer headers from the first record if not provided
      const inferredHeaders = headers || Object.keys(data[0]);
      
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: inferredHeaders.map(h => ({ id: h, title: h }))
      });

      // Convert data to string format for CSV
      const csvData = data.map(record => this.stringifyRecord(record));
      await csvWriter.writeRecords(csvData);
    });
  }

  async appendCSV<T extends Record<string, any>>(filename: string, record: T): Promise<void> {
    return this.withLock(`append-${filename}`, async () => {
      const existing = await this.readCSV<T>(filename);
      existing.push(record);
      await this.writeCSV(filename, existing);
    });
  }

  async updateCSV<T extends Record<string, any>>(
    filename: string,
    predicate: (record: T) => boolean,
    updates: Partial<T>
  ): Promise<boolean> {
    return this.withLock(`update-${filename}`, async () => {
      const records = await this.readCSV<T>(filename);
      let updated = false;

      const updatedRecords = records.map(record => {
        if (predicate(record)) {
          updated = true;
          return { ...record, ...updates };
        }
        return record;
      });

      if (updated) {
        await this.writeCSV(filename, updatedRecords);
      }

      return updated;
    });
  }

  async deleteFromCSV<T extends Record<string, any>>(
    filename: string,
    predicate: (record: T) => boolean
  ): Promise<boolean> {
    return this.withLock(`delete-${filename}`, async () => {
      const records = await this.readCSV<T>(filename);
      const filtered = records.filter(record => !predicate(record));
      
      const deleted = records.length !== filtered.length;
      if (deleted) {
        await this.writeCSV(filename, filtered);
      }

      return deleted;
    });
  }

  private stringifyRecord(record: Record<string, any>): Record<string, string> {
    const stringified: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined) {
        stringified[key] = "";
      } else if (typeof value === "object") {
        stringified[key] = JSON.stringify(value);
      } else {
        stringified[key] = String(value);
      }
    }
    
    return stringified;
  }

  private convertTypes(record: Record<string, string>): any {
    const converted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(record)) {
      if (value === "" || value === null || value === undefined) {
        converted[key] = value === "" ? undefined : value;
        continue;
      }

      // Try to parse as number
      if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
        const num = Number(value);
        converted[key] = Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
        continue;
      }

      // Try to parse as boolean
      if (value.toLowerCase() === "true") {
        converted[key] = true;
        continue;
      }
      if (value.toLowerCase() === "false") {
        converted[key] = false;
        continue;
      }

      // Try to parse as JSON
      if ((value.startsWith("{") && value.endsWith("}")) || 
          (value.startsWith("[") && value.endsWith("]"))) {
        try {
          converted[key] = JSON.parse(value);
          continue;
        } catch {
          // Not valid JSON, treat as string
        }
      }

      // Default to string
      converted[key] = value;
    }
    
    return converted;
  }

  async exportToFormat(filename: string, format: "csv" | "json" = "csv"): Promise<Buffer> {
    const data = await this.readCSV(filename);
    
    if (format === "json") {
      return Buffer.from(JSON.stringify(data, null, 2));
    }
    
    // For CSV, read the raw file
    const filePath = this.getFilePath(filename);
    try {
      const csvContent = await fs.readFile(filePath);
      return csvContent;
    } catch {
      return Buffer.from("");
    }
  }

  async getStats(filename: string): Promise<{ recordCount: number; lastModified: Date | null }> {
    const filePath = this.getFilePath(filename);
    
    try {
      const stats = await fs.stat(filePath);
      const data = await this.readCSV(filename);
      
      return {
        recordCount: data.length,
        lastModified: stats.mtime
      };
    } catch {
      return {
        recordCount: 0,
        lastModified: null
      };
    }
  }
}

// Global instance
export const csvService = new CSVService();
