'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageData {
  name: string;
  url: string;
  size: number;
  date: string;
}

interface QuoteData {
  quote: string;
  date: string;
  totalQuotes: number;
}

export default function Home() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both image and quote in parallel
        const [imageResponse, quoteResponse] = await Promise.all([
          fetch('/api/image'),
          fetch('/api/quote')
        ]);

        if (!imageResponse.ok) {
          throw new Error('Failed to fetch image');
        }
        if (!quoteResponse.ok) {
          throw new Error('Failed to fetch quote');
        }

        const imageResult = await imageResponse.json();
        const quoteResult = await quoteResponse.json();

        setImageData(imageResult);
        setQuoteData(quoteResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-black text-white px-6 py-2 rounded-full text-sm hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-light text-gray-900 mb-3">
            Daily Romance
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            {imageData?.date && formatDate(imageData.date)}
          </p>
        </div>

        <div className="space-y-12 md:space-y-16">
          {/* Image Section */}
          {imageData && (
            <div className="group">
              <div className="relative aspect-[4/3] md:aspect-[16/10] rounded-lg md:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                <Image
                  src={imageData.url}
                  alt={imageData.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                />
              </div>
            </div>
          )}

          {/* Quote Section */}
          {quoteData && (
            <div className="text-center px-4 md:px-8">
              <blockquote className="text-xl md:text-3xl lg:text-4xl font-light text-gray-900 leading-relaxed max-w-3xl mx-auto">
                &ldquo;{quoteData.quote}&rdquo;
              </blockquote>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 md:mt-24">
          <p className="text-gray-400 text-xs md:text-sm">
            A new romance awaits tomorrow
          </p>
        </div>
      </div>
    </main>
  );
}