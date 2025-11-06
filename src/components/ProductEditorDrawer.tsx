import React, { useState, useEffect, ChangeEvent } from 'react';
import { Product } from '../types';
import { mockGenerateDescription } from '../services/mockAIService';
import { mockVocabulary } from '../mockData';

interface ProductEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

type ActiveTab = 'core' | 'context' | 'generation' | 'variants';

const ProductEditorDrawer: React.FC<ProductEditorDrawerProps> = ({ isOpen, onClose, product }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('core');
  const [editableProduct, setEditableProduct] = useState<Product | null>(product);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setEditableProduct(product);
    setActiveTab('core');
  }, [product]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editableProduct) return;
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setEditableProduct({ ...editableProduct, [name]: checked });
        return;
    }

    setEditableProduct({ ...editableProduct, [name]: value });
  };

  const handleWebsiteChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editableProduct) return;
    const { value: websiteName, checked } = e.target;
    
    const currentWebsites = new Set(editableProduct.websites);
    if (checked) {
        currentWebsites.add(websiteName);
    } else {
        currentWebsites.delete(websiteName);
    }
    
    setEditableProduct({
        ...editableProduct,
        websites: Array.from(currentWebsites)
    });
  };

  const handleNestedChange = (
    e: ChangeEvent<HTMLTextAreaElement>,
    section: 'aiContext'
  ) => {
    if (!editableProduct) return;
    const { name, value } = e.target;

    if (name === 'keywords' || name === 'featureBullets') {
        const valueAsArray = value.split('\n').map(item => item.trim()).filter(item => item);
         setEditableProduct({
            ...editableProduct,
            [section]: {
                ...editableProduct[section],
                [name]: valueAsArray,
            },
        });
    } else {
        setEditableProduct({
            ...editableProduct,
            [section]: {
                ...editableProduct[section],
                [name]: value,
            },
        });
    }
  };
  
  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
      const result = await mockGenerateDescription();
      if (editableProduct) {
        setEditableProduct({
          ...editableProduct,
          marketing: {
            ...editableProduct.marketing,
            title: result.title,
            bullets: result.bullets,
            seo: result.seo,
            paragraphDraft: result.paragraphDraft,
          },
        });
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const TabButton: React.FC<{ tabName: ActiveTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        activeTab === tabName
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
  
  const SelectField: React.FC<{label: string; name: keyof Product; options: readonly string[]; value: string;}> = ({label, name, options, value}) => (
      <FormField label={label}>
        <select name={name} value={value} onChange={handleInputChange} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </FormField>
  );

  const drawerContainerClasses = `fixed inset-0 overflow-hidden z-50 transition-opacity ${
    isOpen ? 'ease-out duration-300 opacity-100' : 'ease-in duration-200 opacity-0 pointer-events-none'
  }`;

  const drawerPanelClasses = `transform transition ease-in-out duration-500 ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  if (!editableProduct) return null;

  return (
    <div className={drawerContainerClasses} role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} aria-hidden="true"></div>
        <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div className={`w-screen max-w-3xl ${drawerPanelClasses}`}>
            <form className="h-full flex flex-col bg-white shadow-xl">
              <header className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">{editableProduct.name}</h2>
                        <p className="mt-1 text-sm text-gray-500">{editableProduct.brand} - {editableProduct.mpn}</p>
                    </div>
                  <button type="button" className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={onClose}>
                    <span className="sr-only">Close panel</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </header>

                <nav className="px-4 py-2 border-b border-gray-200 bg-white">
                    <div className="flex space-x-2">
                        <TabButton tabName="core" label="Core Information" />
                        <TabButton tabName="context" label="AI Context" />
                        <TabButton tabName="generation" label="AI Generation" />
                        <TabButton tabName="variants" label="Variants" />
                    </div>
                </nav>

              <div className="relative flex-1 p-6 overflow-y-auto">
                {activeTab === 'core' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                             <FormField label="Name"><input type="text" value={editableProduct.name} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="MPN"><input type="text" value={editableProduct.mpn} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="Brand"><input type="text" name="brand" value={editableProduct.brand} onChange={handleInputChange} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                             
                             <SelectField label="Department" name="department" value={editableProduct.department} options={mockVocabulary.departments} />
                             <SelectField label="Class" name="class" value={editableProduct.class} options={mockVocabulary.classes} />
                             <SelectField label="Category" name="category" value={editableProduct.category} options={mockVocabulary.categories} />
                             <SelectField label="Age Group" name="ageGroup" value={editableProduct.ageGroup} options={mockVocabulary.ageGroups} />
                             <SelectField label="Gender" name="gender" value={editableProduct.gender} options={mockVocabulary.genders} />
                             
                             <FormField label="Material/Fabric"><input type="text" name="materialFabric" value={editableProduct.materialFabric} onChange={handleInputChange} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                             <FormField label="Fit"><input type="text" name="fit" value={editableProduct.fit} onChange={handleInputChange} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>

                             <SelectField label="Sports Team" name="sportsTeam" value={editableProduct.sportsTeam || ''} options={['', ...mockVocabulary.sportsTeams]} />
                             <SelectField label="League" name="league" value={editableProduct.league || ''} options={['', ...mockVocabulary.leagues]} />

                             <SelectField label="Status" name="status" value={editableProduct.status} options={mockVocabulary.statuses} />
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                          <FormField label="Websites">
                            <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                              {mockVocabulary.websites.map(website => (
                                <div key={website} className="flex items-center">
                                  <input id={`website-${website}`} type="checkbox" value={website} checked={editableProduct.websites.includes(website)} onChange={handleWebsiteChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                  <label htmlFor={`website-${website}`} className="ml-2 block text-sm text-gray-900">{website}</label>
                                </div>
                              ))}
                            </div>
                          </FormField>
                           <FormField label="Featured on Launch Hub">
                              <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                                <div className="flex items-center">
                                  <input id="featured" name="featured" type="checkbox" checked={editableProduct.featured} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">Make this a featured product</label>
                                </div>
                               </div>
                           </FormField>
                        </div>
                         <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-md font-medium text-gray-900">Product Flags</h3>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                                <div className="flex items-center">
                                    <input id="map" name="map" type="checkbox" checked={editableProduct.map} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="map" className="ml-3 block text-sm font-medium text-gray-900">MAP</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="promo" name="promo" type="checkbox" checked={editableProduct.promo} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="promo" className="ml-3 block text-sm font-medium text-gray-900">Promo</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="hype" name="hype" type="checkbox" checked={editableProduct.hype} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="hype" className="ml-3 block text-sm font-medium text-gray-900">HYPE</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="fastfashion" name="fastfashion" type="checkbox" checked={editableProduct.fastfashion} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="fastfashion" className="ml-3 block text-sm font-medium text-gray-900">Fast Fashion</label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'context' && (
                    <div className="space-y-6">
                        <FormField label="Keywords (one per line)"><textarea name="keywords" value={editableProduct.aiContext.keywords.join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Feature Bullets (one per line)"><textarea name="featureBullets" value={editableProduct.aiContext.featureBullets.join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Design Notes"><textarea name="designNotes" value={editableProduct.aiContext.designNotes} onChange={(e) => handleNestedChange(e, 'aiContext')} rows={6} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                    </div>
                )}
                {activeTab === 'generation' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button type="button" onClick={handleGenerateClick} disabled={isGenerating} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                            </button>
                        </div>
                        <FormField label="Generated Title"><div className="p-2 bg-gray-100 rounded-md min-h-[40px]">{editableProduct.marketing.title}</div></FormField>
                        <FormField label="Generated Bullets"><ul className="p-2 pl-6 bg-gray-100 rounded-md min-h-[80px] list-disc space-y-1">{editableProduct.marketing.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul></FormField>
                        <FormField label="Generated SEO Description"><div className="p-2 bg-gray-100 rounded-md min-h-[60px]">{editableProduct.marketing.seo}</div></FormField>
                        <FormField label="Generated Paragraph Draft"><div className="p-2 bg-gray-100 rounded-md min-h-[120px] whitespace-pre-wrap">{editableProduct.marketing.paragraphDraft}</div></FormField>
                        <div className="flex justify-end pt-4"><button type="button" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Approve</button></div>
                    </div>
                )}
                {activeTab === 'variants' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {editableProduct.variants.map(v => (<tr key={v.variantId}><td className="px-4 py-2 text-sm text-gray-500">{v.sku}</td><td className="px-4 py-2 text-sm text-gray-500">{v.size}</td><td className="px-4 py-2 text-sm text-gray-500">{v.color}</td><td className="px-4 py-2 text-sm text-gray-500 text-right">${v.price.toFixed(2)}</td></tr>))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <footer className="flex-shrink-0 px-4 py-4 flex justify-end border-t border-gray-200 bg-gray-50">
                <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
                <button type="submit" className="ml-4 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
              </footer>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductEditorDrawer;