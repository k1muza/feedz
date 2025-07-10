'use client';
import React, { useState, useEffect } from 'react';
import { useAnimal } from '@/context/AnimalContext';
import { Animal, AnimalProgram, AnimalProgramStage } from '@/types/animals';

interface AnimalSelectorProps {
  onSelectionChange: (
    animal: Animal | null,
    program: AnimalProgram | null,
    stage: AnimalProgramStage | null
  ) => void;
}

const AnimalSelector: React.FC<AnimalSelectorProps> = ({ onSelectionChange }) => {
  const { animals, selectedAnimal, setSelectedAnimal } = useAnimal();
  const [selectedProgram, setSelectedProgram] = useState<AnimalProgram | null>(null);
  const [selectedStage, setSelectedStage] = useState<AnimalProgramStage | null>(null);

  const handleAnimalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const animal = animals.find((a) => a.id === Number(e.target.value));
    setSelectedAnimal(animal ?? null);
    setSelectedProgram(null);
    setSelectedStage(null);
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const program = selectedAnimal?.programs.find((p: AnimalProgram) => p.id === Number(e.target.value)) || null;
    setSelectedProgram(program);
    setSelectedStage(null);
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stage = selectedProgram?.stages.find((s) => s.id === Number(e.target.value)) || null;
    setSelectedStage(stage);
  };

  useEffect(() => {
    onSelectionChange(selectedAnimal, selectedProgram, selectedStage);
  }, [selectedAnimal, selectedProgram, selectedStage, onSelectionChange]);

  return (
    <div className="space-y-6 p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Animal Selection */}
        <div>
          <label htmlFor="animal" className="block text-sm font-medium text-gray-200 mb-2">
            Select Breed
          </label>
          <select
            id="animal"
            value={selectedAnimal?.id || ''}
            onChange={handleAnimalChange}
            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm 
                     text-gray-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 
                     transition-all hover:border-gray-500"
          >
            <option value="" disabled className="bg-gray-700 text-gray-300">
              -- Select Breed --
            </option>
            {animals.map((animal) => (
              <option 
                key={animal.id} 
                value={animal.id}
                className="bg-gray-700 text-gray-200"
              >
                {animal.breed}
              </option>
            ))}
          </select>
        </div>

        {/* Program Selection */}
        <div>
          <label htmlFor="program" className="block text-sm font-medium text-gray-200 mb-2">
            Select Market Segment
          </label>
          <select
            id="program"
            value={selectedProgram?.id || ''}
            onChange={handleProgramChange}
            disabled={!selectedAnimal}
            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm 
                     text-gray-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 
                     transition-all hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="bg-gray-700 text-gray-300">
              {selectedAnimal ? '-- Select Segment --' : '-- Select Breed First --'}
            </option>
            {selectedAnimal?.programs.map((program: AnimalProgram) => (
              <option 
                key={program.id} 
                value={program.id}
                className="bg-gray-700 text-gray-200"
              >
                {program.market_segment}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Selection */}
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-200 mb-2">
            Select Growth Stage
          </label>
          <select
            id="stage"
            value={selectedStage?.id || ''}
            onChange={handleStageChange}
            disabled={!selectedProgram}
            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm 
                     text-gray-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 
                     transition-all hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="bg-gray-700 text-gray-300">
              {selectedProgram ? '-- Select Stage --' : '-- Select Segment First --'}
            </option>
            {selectedProgram?.stages.map((stage) => (
              <option 
                key={stage.id} 
                value={stage.id}
                className="bg-gray-700 text-gray-200"
              >
                {stage.stage}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AnimalSelector;
