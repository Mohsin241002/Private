import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID || '1wrrH8GocmtdfbHRo0r-ERHmyjk1wKqyrSbu-Oqn9Vxw';
    
    // Try different approaches for accessing the Google Sheet
    let response;
    let csvData;

    try {
      // First try: Standard CSV export (should work if sheet is public)
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      response = await axios.get(csvUrl, {
        headers: {
          'User-Agent': 'daily-inspiration-app',
          'Accept': 'text/csv,text/plain,*/*'
        },
        maxRedirects: 10,
        timeout: 15000,
        validateStatus: (status) => status < 400
      });
      csvData = response.data;
    } catch {
      // Second try: With gid parameter
      try {
        const csvWithGidUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        response = await axios.get(csvWithGidUrl, {
          headers: {
            'User-Agent': 'daily-inspiration-app',
            'Accept': 'text/csv,text/plain,*/*'
          },
          maxRedirects: 10,
          timeout: 15000,
          validateStatus: (status) => status < 400
        });
        csvData = response.data;
        } catch {
          // Third try: Alternative query format
          try {
          const altCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
          response = await axios.get(altCsvUrl, {
            headers: {
              'User-Agent': 'daily-inspiration-app',
              'Accept': 'text/csv,text/plain,*/*'
            },
            maxRedirects: 10,
            timeout: 15000,
            validateStatus: (status) => status < 400
          });
          csvData = response.data;
          } catch (finalError) {
            console.error('All Google Sheets access methods failed:', finalError);
            return NextResponse.json({
            error: 'Unable to access Google Sheets. Please ensure the sheet is shared publicly with "Anyone with the link" permissions.' 
          }, { status: 500 });
        }
      }
    }

    // Parse CSV data with proper handling of quoted fields containing commas
    const lines = csvData.split('\n');
    
    // Function to parse a CSV line properly handling quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes ("")
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };
    
    // Parse the CSV and create a map of date -> quote
    const quoteMap = new Map<string, string>();
    const allQuotes: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const columns = parseCSVLine(line);
      if (columns.length >= 2 && columns[0] && columns[1]) {
        const dateKey = columns[0].trim();
        let quote = columns[1].trim();
        
        // Remove surrounding quotes if present
        if (quote.startsWith('"') && quote.endsWith('"')) {
          quote = quote.slice(1, -1);
        }
        
        if (dateKey && quote) {
          quoteMap.set(dateKey, quote);
          allQuotes.push(quote);
        }
      }
    }

    if (quoteMap.size === 0 && allQuotes.length === 0) {
      return NextResponse.json({ error: 'No quotes found' }, { status: 404 });
    }

    // Get current date
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Try to find quote based on day of month
    const dayOfMonth = today.getDate().toString();
    let selectedQuote = quoteMap.get(dayOfMonth);
    
    // If no quote found for today's day of month, try day of year
    if (!selectedQuote) {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      selectedQuote = quoteMap.get(dayOfYear.toString());
    }
    
    // If still no quote found, use consistent daily selection from available quotes
    if (!selectedQuote && allQuotes.length > 0) {
      // Create a simple hash from the date string to get consistent randomness
      let hash = 0;
      for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Use the hash to select a quote consistently for the day
      const selectedIndex = Math.abs(hash) % allQuotes.length;
      selectedQuote = allQuotes[selectedIndex];
    }
    
    if (!selectedQuote) {
      return NextResponse.json({ error: 'No quote available for today' }, { status: 404 });
    }

    return NextResponse.json({
      quote: selectedQuote,
      date: dateString,
      dayOfMonth: today.getDate(),
      totalQuotes: allQuotes.length,
      matchedByDate: quoteMap.has(today.getDate().toString())
    });

  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote from Google Sheets' }, { status: 500 });
  }
}
