import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-white">Romki Barber Shop</h1>
        <p className="mt-4 text-center text-gray-600 dark:text-gray-300">Your hair, our passion. Book your appointment now and experience the best haircut of your life.</p>
        <div className="mt-8 text-center">
          <Link href="/booking" className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
