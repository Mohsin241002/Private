import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const username = process.env.GITHUB_USERNAME || 'Mohsin241002';
    const repo = process.env.GITHUB_REPO || 'images';
    const token = process.env.GITHUB_TOKEN;

    // Set up headers with authentication if token is provided
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'daily-inspiration-app'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch the list of files from the GitHub repository
    const response = await axios.get(
      `https://api.github.com/repos/${username}/${repo}/contents`,
      { headers }
    );

    const files = response.data;
    
    // Filter for image files (jpg, jpeg, png, gif, webp)
    const imageFiles = files.filter((file: { name: string; download_url: string; size: number }) => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
    });

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No images found' }, { status: 404 });
    }

    // Get current date and use it as seed for consistent daily selection
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Create a simple hash from the date string to get consistent randomness
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash to select an image consistently for the day
    const selectedIndex = Math.abs(hash) % imageFiles.length;
    const selectedImage = imageFiles[selectedIndex];

    return NextResponse.json({
      name: selectedImage.name,
      url: selectedImage.download_url,
      size: selectedImage.size,
      date: dateString
    });

  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image from GitHub repository' }, { status: 500 });
  }
}
