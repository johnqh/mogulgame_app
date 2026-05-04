#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables: .env first (defaults), then .env.local (overrides)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

// Required environment variables with fallbacks
const APP_DOMAIN = process.env.VITE_APP_DOMAIN || 'localhost';
const APP_NAME = process.env.VITE_APP_NAME || 'Starter';
const COMPANY_NAME = process.env.VITE_COMPANY_NAME || 'Sudobility';
const SUPPORT_EMAIL = process.env.VITE_SUPPORT_EMAIL || `support@${APP_DOMAIN}`;

// Get today's date for lastmod
const TODAY = new Date().toISOString().split('T')[0];

interface FileTemplate {
  template: string; // Template file path (relative to project root)
  output: string; // Output file path (relative to project root)
  description: string;
}

// Define files to process
const FILES_TO_PROCESS: FileTemplate[] = [
  {
    template: 'index_template.html',
    output: 'index.html',
    description: 'Main HTML file',
  },
  {
    template: 'public/sitemap.template.xml',
    output: 'public/sitemap.xml',
    description: 'Sitemap',
  },
  {
    template: 'public/robots.template.txt',
    output: 'public/robots.txt',
    description: 'Robots.txt',
  },
];

function replaceVariables(content: string): string {
  let processed = content;

  // Replace all template variables
  processed = processed.replace(/\{\{VITE_APP_DOMAIN\}\}/g, APP_DOMAIN);
  processed = processed.replace(/\{\{VITE_APP_NAME\}\}/g, APP_NAME);
  processed = processed.replace(/\{\{VITE_COMPANY_NAME\}\}/g, COMPANY_NAME);
  processed = processed.replace(/\{\{VITE_SUPPORT_EMAIL\}\}/g, SUPPORT_EMAIL);
  processed = processed.replace(/\{\{TODAY\}\}/g, TODAY);

  return processed;
}

function processFile(fileConfig: FileTemplate): void {
  const projectRoot = path.join(__dirname, '..');
  const templatePath = path.join(projectRoot, fileConfig.template);
  const outputPath = path.join(projectRoot, fileConfig.output);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.log(`⚠️  Template not found: ${fileConfig.template}, skipping`);
    return;
  }

  try {
    // Read template
    const template = fs.readFileSync(templatePath, 'utf8');

    // Replace variables
    const processed = replaceVariables(template);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(outputPath, processed, 'utf8');

    console.log(`✅ Processed ${fileConfig.description}: ${fileConfig.output}`);
  } catch (error) {
    console.error(`❌ Error processing ${fileConfig.template}:`, error);
    process.exit(1);
  }
}

function main() {
  console.log('🔧 Processing static files...');
  console.log(`   Domain: ${APP_DOMAIN}`);
  console.log(`   App Name: ${APP_NAME}`);
  console.log(`   Company: ${COMPANY_NAME}`);
  console.log('');

  let processedCount = 0;
  let skippedCount = 0;

  for (const fileConfig of FILES_TO_PROCESS) {
    const templatePath = path.join(__dirname, '..', fileConfig.template);
    if (fs.existsSync(templatePath)) {
      processFile(fileConfig);
      processedCount++;
    } else {
      console.log(`⚠️  Template not found: ${fileConfig.template}`);
      skippedCount++;
    }
  }

  console.log('');
  console.log(`✨ Static file processing complete!`);
  console.log(`   Processed: ${processedCount} files`);
  if (skippedCount > 0) {
    console.log(`   Skipped: ${skippedCount} files (templates not found)`);
  }
}

main();
