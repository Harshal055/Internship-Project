import React from 'react';

const ChallengesSection = () => (
    <section className="py-20">
        <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Current Challenges</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                        <img src="https://placehold.co/300x200" alt={`Challenge ${index + 1} thumbnail`} className="w-full h-40 object-cover mb-4 rounded" />
                        <h3 className="text-2xl font-bold mb-2">Challenge {index + 1}</h3>
                        <p className="text-gray-700 mb-4">Description of challenge {index + 1} goes here. It includes details about the challenge.</p>
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">View Challenge</button>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default ChallengesSection;
