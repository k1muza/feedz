import { Composition } from "@/types";

interface TechnicalSpecsProps {
  compositions?: Composition[]; // Add the ? to make the property optional
}

export const TechnicalSpecs: React.FC<TechnicalSpecsProps> = ({ compositions }) => {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Technical Specifications</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              {compositions?.map((composition, key) => (
                <tr key={key}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {composition.nutrient?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {composition.value} {composition.nutrient?.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }