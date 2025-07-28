// Crea un nuovo file: src/app/books/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Home } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Book {
  id: number;
  title: string;
  author: string;
  image: string;
  amazonUrl: string;
  description: string;
  price?: string;
}

// Libri di esempio - sostituisci con i tuoi libri reali
const BOOKS_DATA: Book[] = [
  {
    id: 1,
    title: "Python: Guida Completa",
    author: "Marco Rossi",
    image: "https://m.media-amazon.com/images/I/71KmWr6P9WL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B08KH5X3P2",
    description: "Una guida completa per imparare Python dalle basi all'avanzato",
    price: "€ 24,90"
  },
  {
    id: 2,
    title: "JavaScript: Il Manuale Definitivo",
    author: "Laura Bianchi",
    image: "https://m.media-amazon.com/images/I/51WTLk4KQZL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B07DFHGKXB",
    description: "Tutto quello che devi sapere su JavaScript moderno",
    price: "€ 29,90"
  },
  {
    id: 3,
    title: "React: Sviluppo di Applicazioni Web",
    author: "Giuseppe Verdi",
    image: "https://m.media-amazon.com/images/I/41BKx1AxQWL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B08N5LPQXD",
    description: "Crea applicazioni web moderne con React",
    price: "€ 27,50"
  },
  {
    id: 4,
    title: "Machine Learning con Python",
    author: "Anna Neri",
    image: "https://m.media-amazon.com/images/I/71RXvnZ4JpL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B07XCKH83R",
    description: "Introduzione pratica al machine learning",
    price: "€ 32,00"
  },
  {
    id: 5,
    title: "CSS: Design Moderno",
    author: "Paolo Romano",
    image: "https://m.media-amazon.com/images/I/51SYCNa8rCL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B086WHBQHG",
    description: "Tecniche avanzate di CSS per design responsivi",
    price: "€ 22,50"
  },
  {
    id: 6,
    title: "Node.js: Guida Pratica",
    author: "Elena Conti",
    image: "https://m.media-amazon.com/images/I/41HuEKnPLiL._AC_UF1000,1000_QL80_.jpg",
    amazonUrl: "https://www.amazon.it/dp/B08M5GNM47",
    description: "Sviluppo backend con Node.js",
    price: "€ 26,90"
  }
];

export default function BooksPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);

  // Verifica autenticazione
  useEffect(() => {
    checkAuth();
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  };

  // Gestione responsive
  const handleResize = () => {
    if (window.innerWidth < 640) {
      setItemsPerView(1);
    } else if (window.innerWidth < 1024) {
      setItemsPerView(2);
    } else {
      setItemsPerView(3);
    }
  };

  const maxIndex = Math.max(0, BOOKS_DATA.length - itemsPerView);

  const goToPrevious = () => {
    if (isAnimating || currentIndex === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const goToNext = () => {
    if (isAnimating || currentIndex >= maxIndex) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBookClick = (amazonUrl: string) => {
    window.open(amazonUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              I Nostri Libri
            </h1>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
            >
              <Home className="w-4 h-4" />
              <span>Torna ai corsi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Intro */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Scopri la nostra selezione di libri per approfondire le tue conoscenze di programmazione.
            Clicca su un libro per acquistarlo su Amazon.
          </p>
        </div>

        {/* Carosello */}
        <div className="relative">
          {/* Bottone Previous */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
              currentIndex === 0
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Container Libri */}
          <div className="overflow-hidden mx-12">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
              }}
            >
              {BOOKS_DATA.map((book) => (
                <div
                  key={book.id}
                  className={`px-3 transition-all duration-300`}
                  style={{
                    minWidth: `${100 / itemsPerView}%`,
                  }}
                >
                  <div
                    onClick={() => handleBookClick(book.amazonUrl)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  >
                    {/* Immagine */}
                    <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-700">
                      <img
                        src={book.image}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300" />
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        di {book.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
                        {book.description}
                      </p>
                      <div className="flex items-center justify-between">
                        {book.price && (
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {book.price}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all duration-200">
                          <span className="text-sm">Amazon</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottone Next */}
          <button
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
              currentIndex >= maxIndex
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Indicatori */}
        <div className="flex justify-center mt-8 gap-2">
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-8 bg-blue-600 dark:bg-blue-400"
                  : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>

        {/* Info aggiuntive */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tutti i libri sono disponibili su Amazon. I prezzi potrebbero variare.
          </p>
        </div>
      </div>
    </div>
  );
}