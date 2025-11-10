import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { Product, ProductFacts } from '../types';
import { describeProduct } from '../services/describe';
import { useVocab } from '../hooks/useVocab';
import { db, storage } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Toast from './Toast';
import Select from './ui/Select';

interface ProductEditorV2Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved?: (productId: string, updates: Partial<Product>) => void;
}

type ActiveTab = 'attributes' | 'facts' | 'ai';

type AIDescription = { 
  text: string; 
  meta?: { tone: string; length: string; generatedAt: any } 
};

// Helper to clean data for Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') out[k] = null;
    else out[k] = v;
  }
  return out as Partial<T>;
}

const ProductEditorV2: React.FC<ProductEditorV2Props> = ({ isOpen, onClose, product, onSaved }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('attributes');
  const [editableProduct, setEditableProduct] = useState<Product | null>(product);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Live vocabulary
  const vocab = useVocab();
  
  // Product Facts state
  const [facts, setFacts] = useState<ProductFacts>({
    observations: '',
    materials: '',
    fit: '',
    useCases: '',
    care: '',
    teamLeague: '',
    keywords: [],
    images: [],
    updatedBy: '',
    updatedAt: null,
  });
  const [factsSaving, setFactsSaving] = useState(false);
  const [factsLastSaved, setFactsLastSaved] = useState<Date | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const factsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI Descriptions
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, AIDescription>>({});
  const [aiTone, setAiTone] = useState('Clean');
  const [aiLength, setAiLength] = useState('Medium');
  const [generatingInline, setGeneratingInline] = useState(false);

  // Sync local state when product changes
  useEffect(() => {
    setEditableProduct(product);
  }, [product?.id]);

  // Load Product Facts
  useEffect(() => {
    if (!product?.id) {
      setFacts({
        observations: '',
        materials: '',
        fit: '',
        useCases: '',
        care: '',
        teamLeague: '',
        keywords: [],
        images: [],
        updatedBy: '',
        updatedAt: null,
      });
      return;
    }

    const loadFacts = async () => {
      try {
        const factsRef = doc(db, 'products', product.id, 'facts', 'data');
        const snapshot = await getDoc(factsRef);
        
        if (snapshot.exists()) {
          setFacts(snapshot.data() as ProductFacts);
        } else {
          setFacts({
            observations: '',
            materials: '',
            fit: '',
            useCases: '',
            care: '',
            teamLeague: '',
            keywords: [],
            images: [],
            updatedBy: '',
            updatedAt: null,
          });
        }
      } catch (error) {
        console.error('[editorV2] Failed to load facts:', error);
      }
    };

    loadFacts();
  }, [product?.id]);

  // Load AI descriptions
  useEffect(() => {
    if (!product?.id) {
      setAiDescriptions({});
      return;
    }

    const loadDescriptions = async () => {
      try {
        const descriptionsRef = collection(db, 'products', product.id, 'descriptions');
        const snapshot = await getDocs(descriptionsRef);
        const descriptions: Record<string, AIDescription> = {};
        
        snapshot.forEach((doc) => {
          descriptions[doc.id] = doc.data() as AIDescription;
        });
        
        setAiDescriptions(descriptions);
      } catch (error) {
        console.error('[editorV2] Failed to load AI descriptions:', error);
      }
    };

    loadDescriptions();
  }, [product?.id]);

  // Save facts with debounce
  const saveFacts = async (updatedFacts: ProductFacts) => {
    if (!product?.id) return;

    try {
      setFactsSaving(true);
      const factsRef = doc(db, 'products', product.id, 'facts', 'data');
      await setDoc(factsRef, {
        ...updatedFacts,
        updatedAt: serverTimestamp(),
        updatedBy: 'current-user', // TODO: Get from auth context
      }, { merge: true });
      
      setFactsLastSaved(new Date());
    } catch (error) {
      console.error('[editorV2] Failed to save facts:', error);
      setToastMessage({ text: 'Failed to save product facts', type: 'error' });
    } finally {
      setFactsSaving(false);
    }
  };

  // Handle facts field changes with debounce
  const handleFactsChange = (field: keyof ProductFacts, value: string) => {
    const updated = { ...facts, [field]: value };
    setFacts(updated);

    if (factsTimeoutRef.current) clearTimeout(factsTimeoutRef.current);
    factsTimeoutRef.current = setTimeout(() => {
      saveFacts(updated);
    }, 500);
  };

  // Add keyword
  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const updated = { ...facts, keywords: [...facts.keywords, keywordInput.trim()] };
    setFacts(updated);
    setKeywordInput('');
    saveFacts(updated);
  };

  // Remove keyword
  const handleRemoveKeyword = (index: number) => {
    const updated = { ...facts, keywords: facts.keywords.filter((_, i) => i !== index) };
    setFacts(updated);
    saveFacts(updated);
  };

  // Handle image upload
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!product?.id || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const storageRef = ref(storage, `products/${product.id}/images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const updated = { ...facts, images: [...facts.images, downloadURL] };
      setFacts(updated);
      await saveFacts(updated);
      
      setToastMessage({ text: 'Image uploaded', type: 'success' });
    } catch (error) {
      console.error('[editorV2] Image upload failed:', error);
      setToastMessage({ text: 'Failed to upload image', type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove image
  const handleRemoveImage = async (imageUrl: string, index: number) => {
    if (!product?.id) return;

    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      
      const updated = { ...facts, images: facts.images.filter((_, i) => i !== index) };
      setFacts(updated);
      await saveFacts(updated);
      
      setToastMessage({ text: 'Image removed', type: 'success' });
    } catch (error) {
      console.error('[editorV2] Failed to remove image:', error);
      setToastMessage({ text: 'Failed to remove image', type: 'error' });
    }
  };

  // Handle attribute changes
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editableProduct) return;
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setEditableProduct({ ...editableProduct, [name]: checked });
      return;
    }

    setEditableProduct({ ...editableProduct, [name]: value });
  }, [editableProduct]);

  const handleSelectChange = useCallback((name: string, value: string) => {
    if (!editableProduct) return;
    setEditableProduct({ ...editableProduct, [name]: value });
  }, [editableProduct]);

  const handleWebsiteChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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
  }, [editableProduct]);

  // AI generation handler
  const handleInlineGenerate = async () => {
    if (!editableProduct?.id) {
      setToastMessage({ text: 'Product ID required', type: 'error' });
      return;
    }

    try {
      setGeneratingInline(true);
      
      const channel = 'RetailOps';
      
      const result = await describeProduct({
        productId: editableProduct.id,
        channel,
        tone: aiTone,
        length: aiLength,
        facts,
        aiContext: editableProduct.aiContext,
        attributes: {
          brand: editableProduct.brand,
          category: editableProduct.category,
          gender: editableProduct.gender,
          ageGroup: editableProduct.ageGroup,
          price: (editableProduct as any).price ?? null
        },
        imageUrl: facts.images[0]
      });

      if (!result.text) {
        setToastMessage({ text: 'No text returned from API', type: 'error' });
        return;
      }

      // Write to Firestore subcollection
      const descRef = doc(db, 'products', editableProduct.id, 'descriptions', channel);
      await setDoc(
        descRef,
        {
          text: result.text,
          meta: {
            tone: aiTone,
            length: aiLength,
            generatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );

      // Auto-apply to paragraphDraft field
      setEditableProduct({
        ...editableProduct,
        marketing: {
          ...editableProduct.marketing,
          paragraphDraft: result.text,
        },
      });

      // Reload descriptions
      const descriptionsRef = collection(db, 'products', editableProduct.id, 'descriptions');
      const snapshot = await getDocs(descriptionsRef);
      const descriptions: Record<string, AIDescription> = {};
      
      snapshot.forEach((doc) => {
        descriptions[doc.id] = doc.data() as AIDescription;
      });
      
      setAiDescriptions(descriptions);
      setToastMessage({ text: 'Generated and applied to draft', type: 'success' });
    } catch (error: any) {
      console.error('[editorV2] Inline generation failed:', error);
      setToastMessage({ text: error?.message || 'Failed to generate description', type: 'error' });
    } finally {
      setGeneratingInline(false);
    }
  };

  // Save product
  const saveProduct = async (extra: Partial<Product> = {}, options?: { showToast?: string; keepOpen?: boolean }) => {
    if (!product || !editableProduct) return;

    setSavingState('saving');

    const payload = cleanForFirestore<any>({
      brand: editableProduct.brand,
      status: editableProduct.status,
      department: editableProduct.department,
      class: editableProduct.class,
      category: editableProduct.category,
      ageGroup: editableProduct.ageGroup,
      gender: editableProduct.gender,
      materialFabric: editableProduct.materialFabric,
      fit: editableProduct.fit,
      sportsTeam: editableProduct.sportsTeam,
      league: editableProduct.league,
      websites: editableProduct.websites,
      featured: editableProduct.featured,
      map: editableProduct.map,
      promo: editableProduct.promo,
      hype: editableProduct.hype,
      fastfashion: editableProduct.fastfashion,
      aiContext: editableProduct.aiContext,
      updatedAt: serverTimestamp(),
      ...extra,
    });

    await setDoc(doc(db, 'products', product.id), payload, { merge: true });

    setEditableProduct(prev => prev ? ({
      ...prev,
      ...Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)),
    }) : null);

    onSaved?.(product.id, payload);

    setSavingState('saved');
    setTimeout(() => setSavingState('idle'), 1000);

    if (options?.showToast) setToastMessage({ text: options.showToast, type: 'success' });

    if (!options?.keepOpen) {
      onClose();
    }
  };

  // Check if can approve
  const canApprove = useCallback(() => {
    if (!editableProduct) return false;
    
    const hasName = !!editableProduct.name?.trim();
    const hasBrand = !!editableProduct.brand?.trim();
    const hasCategory = !!editableProduct.category?.trim();
    
    const hasDraft = !!editableProduct.marketing.paragraphDraft?.trim();
    const hasSavedDescription = Object.keys(aiDescriptions).length > 0;
    const hasDescription = hasDraft || hasSavedDescription;
    
    return hasName && hasBrand && hasCategory && hasDescription;
  }, [editableProduct, aiDescriptions]);

  const getMissingFields = useCallback(() => {
    if (!editableProduct) return [];
    const missing: string[] = [];
    
    if (!editableProduct.name?.trim()) missing.push('Name');
    if (!editableProduct.brand?.trim()) missing.push('Brand');
    if (!editableProduct.category?.trim()) missing.push('Category');
    
    const hasDraft = !!editableProduct.marketing.paragraphDraft?.trim();
    const hasSavedDescription = Object.keys(aiDescriptions).length > 0;
    if (!hasDraft && !hasSavedDescription) {
      missing.push('Marketing Description');
    }
    
    return missing;
  }, [editableProduct, aiDescriptions]);

  // Approve handler
  const handleApprove = useCallback(async () => {
    if (!editableProduct || !product) return;
    
    const missing = getMissingFields();
    if (missing.length > 0) {
      setToastMessage({ 
        text: `Cannot approve: Missing ${missing.join(', ')}`, 
        type: 'error' 
      });
      return;
    }
    
    let finalDescription = editableProduct.marketing.paragraphDraft || '';
    
    if (!finalDescription && Object.keys(aiDescriptions).length > 0) {
      const firstChannel = Object.keys(aiDescriptions)[0];
      finalDescription = aiDescriptions[firstChannel].text;
    }
    
    await saveProduct(
      { 
        status: 'validated',
        marketing: {
          ...editableProduct.marketing,
          paragraphFinal: finalDescription,
        },
      },
      { showToast: 'Approved & ready to export', keepOpen: true }
    );

    // Enqueue for RetailOps export
    try {
      await addDoc(collection(db, 'exportQueue'), {
        productId: editableProduct.id,
        channel: 'RetailOps',
        requestedAt: serverTimestamp(),
        requestedBy: 'system', // TODO: get from auth context
      });
      console.log('[ProductEditorV2] Enqueued for export:', editableProduct.id);
    } catch (err) {
      console.error('[ProductEditorV2] Failed to enqueue export:', err);
      // Don't block approval if queue fails
    }
  }, [editableProduct, product, aiDescriptions, getMissingFields, saveProduct]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (factsTimeoutRef.current) clearTimeout(factsTimeoutRef.current);
    };
  }, []);

  if (!isOpen || !editableProduct) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} aria-hidden="true"></div>
        <section className="absolute inset-y-0 right-0 max-w-full flex w-full sm:w-auto sm:pl-10">
          <div className="w-full sm:w-screen sm:max-w-3xl">
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <header className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 truncate">{editableProduct.name}</h2>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">{editableProduct.brand} - {editableProduct.mpn}</p>
                  </div>
                  <button 
                    type="button" 
                    className="ml-3 p-2 rounded-md text-gray-400 hover:text-gray-500 flex-shrink-0 touch-manipulation" 
                    onClick={onClose}
                  >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </header>

              {/* Tabs */}
              <nav className="px-2 sm:px-4 py-2 border-b border-gray-200 bg-white overflow-x-auto">
                <div className="flex space-x-1 sm:space-x-2 min-w-max">
                  <button
                    type="button"
                    onClick={() => setActiveTab('attributes')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap touch-manipulation ${
                      activeTab === 'attributes'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Attributes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('facts')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap touch-manipulation ${
                      activeTab === 'facts'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Product Facts
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap touch-manipulation ${
                      activeTab === 'ai'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    AI Product Copy
                  </button>
                </div>
              </nav>

              {/* Content */}
              <div className="relative flex-1 p-3 sm:p-6 overflow-y-auto -webkit-overflow-scrolling-touch pb-24 sm:pb-6">
                {activeTab === 'attributes' && (
                  <div className="space-y-4 sm:space-y-6">
                    {vocab.loading && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs sm:text-sm text-blue-800">
                        Loading vocabulary...
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-y-4 sm:gap-y-6 sm:gap-x-4 sm:grid-cols-2">
                      {/* Name & MPN (read-only) */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Name</label>
                        <input 
                          type="text" 
                          value={editableProduct.name ?? ''} 
                          readOnly 
                          className="block w-full text-sm sm:text-base border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed py-2.5" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">MPN</label>
                        <input 
                          type="text" 
                          value={editableProduct.mpn ?? ''} 
                          readOnly 
                          className="block w-full text-sm sm:text-base border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed py-2.5" 
                        />
                      </div>

                      {/* Brand */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                        <input 
                          type="text" 
                          name="brand" 
                          value={editableProduct.brand ?? ''} 
                          onChange={handleInputChange}
                          disabled={vocab.loading}
                          className="block w-full text-sm sm:text-base border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 py-2.5" 
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <Select 
                          name="department"
                          value={editableProduct.department ?? ''} 
                          onChange={(val) => handleSelectChange('department', val)}
                          options={vocab.departments.map(v => v.value)}
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Class */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Class</label>
                        <Select 
                          name="class"
                          value={editableProduct.class ?? ''} 
                          onChange={(val) => handleSelectChange('class', val)}
                          options={vocab.classes.map(v => v.value)}
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Category</label>
                        <Select 
                          name="category"
                          value={editableProduct.category ?? ''} 
                          onChange={(val) => handleSelectChange('category', val)}
                          options={vocab.categories.map(v => v.value)}
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Age Group */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Age Group</label>
                        <Select 
                          name="ageGroup"
                          value={editableProduct.ageGroup ?? ''} 
                          onChange={(val) => handleSelectChange('ageGroup', val)}
                          options={vocab.ageGroups.map(v => v.value)}
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                        <Select 
                          name="gender"
                          value={editableProduct.gender ?? ''} 
                          onChange={(val) => handleSelectChange('gender', val)}
                          options={vocab.genders.map(v => v.value)}
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Material */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Material/Fabric</label>
                        <Select 
                          name="materialFabric"
                          value={editableProduct.materialFabric ?? ''} 
                          onChange={(val) => handleSelectChange('materialFabric', val)}
                          options={['', ...vocab.materials.map(v => v.value)]}
                          placeholder="Select material..."
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Fit */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Fit</label>
                        <Select 
                          name="fit"
                          value={editableProduct.fit ?? ''} 
                          onChange={(val) => handleSelectChange('fit', val)}
                          options={['', ...vocab.fits.map(v => v.value)]}
                          placeholder="Select fit..."
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Sports Team */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Sports Team</label>
                        <Select 
                          name="sportsTeam"
                          value={editableProduct.sportsTeam ?? ''} 
                          onChange={(val) => handleSelectChange('sportsTeam', val)}
                          options={['', ...vocab.sportsTeams.map(v => v.value)]}
                          placeholder="None"
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* League */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">League</label>
                        <Select 
                          name="league"
                          value={editableProduct.league ?? ''} 
                          onChange={(val) => handleSelectChange('league', val)}
                          options={['', ...vocab.leagues.map(v => v.value)]}
                          placeholder="None"
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <Select 
                          name="status"
                          value={editableProduct.status ?? ''} 
                          onChange={(val) => handleSelectChange('status', val)}
                          options={vocab.statuses.map(v => v.value) as readonly string[]}
                          disabled={vocab.loading}
                        />
                      </div>
                    </div>

                    {/* Websites */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Websites</label>
                      <div className="space-y-3 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        {vocab.loading ? (
                          <div className="text-xs sm:text-sm text-gray-500">Loading...</div>
                        ) : (
                          vocab.websites.map(website => (
                            <div key={website.value} className="flex items-center">
                              <input 
                                id={`website-${website.value}`} 
                                type="checkbox" 
                                value={website.value} 
                                checked={editableProduct.websites.includes(website.value)} 
                                onChange={handleWebsiteChange} 
                                className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                              />
                              <label htmlFor={`website-${website.value}`} className="ml-3 block text-xs sm:text-sm text-gray-900">
                                {website.label}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Product Flags */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-200">
                      <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-3 sm:mb-4">Product Flags</h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center">
                          <input 
                            id="map" 
                            name="map" 
                            type="checkbox" 
                            checked={editableProduct.map} 
                            onChange={handleInputChange} 
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                          />
                          <label htmlFor="map" className="ml-3 block text-xs sm:text-sm font-medium text-gray-900">MAP</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            id="promo" 
                            name="promo" 
                            type="checkbox" 
                            checked={editableProduct.promo} 
                            onChange={handleInputChange} 
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                          />
                          <label htmlFor="promo" className="ml-3 block text-xs sm:text-sm font-medium text-gray-900">Promo</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            id="hype" 
                            name="hype" 
                            type="checkbox" 
                            checked={editableProduct.hype} 
                            onChange={handleInputChange} 
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                          />
                          <label htmlFor="hype" className="ml-3 block text-xs sm:text-sm font-medium text-gray-900">HYPE</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            id="fastfashion" 
                            name="fastfashion" 
                            type="checkbox" 
                            checked={editableProduct.fastfashion} 
                            onChange={handleInputChange} 
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                          />
                          <label htmlFor="fastfashion" className="ml-3 block text-xs sm:text-sm font-medium text-gray-900">Fast Fashion</label>
                        </div>
                      </div>
                    </div>

                    {/* Featured */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Featured on Launch Hub</label>
                      <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center">
                          <input 
                            id="featured" 
                            name="featured" 
                            type="checkbox" 
                            checked={editableProduct.featured} 
                            onChange={handleInputChange} 
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded touch-manipulation" 
                          />
                          <label htmlFor="featured" className="ml-3 block text-xs sm:text-sm text-gray-900">
                            Make this a featured product
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'facts' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-semibold text-gray-800">Product Facts</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {factsSaving && <span>Saving...</span>}
                        {!factsSaving && factsLastSaved && (
                          <span>Saved · {Math.floor((Date.now() - factsLastSaved.getTime()) / 1000)}s ago</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                        <textarea
                          value={facts.observations}
                          onChange={(e) => handleFactsChange('observations', e.target.value)}
                          rows={3}
                          placeholder="What stands out about this product?"
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Materials</label>
                          <textarea
                            value={facts.materials}
                            onChange={(e) => handleFactsChange('materials', e.target.value)}
                            rows={2}
                            placeholder="e.g., 100% cotton"
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fit</label>
                          <textarea
                            value={facts.fit}
                            onChange={(e) => handleFactsChange('fit', e.target.value)}
                            rows={2}
                            placeholder="e.g., Regular, Slim"
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Use Cases</label>
                        <textarea
                          value={facts.useCases}
                          onChange={(e) => handleFactsChange('useCases', e.target.value)}
                          rows={2}
                          placeholder="e.g., Athletic, Casual"
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Care Instructions</label>
                          <textarea
                            value={facts.care}
                            onChange={(e) => handleFactsChange('care', e.target.value)}
                            rows={2}
                            placeholder="e.g., Machine wash cold"
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Team/League</label>
                          <textarea
                            value={facts.teamLeague}
                            onChange={(e) => handleFactsChange('teamLeague', e.target.value)}
                            rows={2}
                            placeholder="e.g., Lakers, NBA"
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Keywords */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                            placeholder="Add keyword..."
                            className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddKeyword}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {facts.keywords.map((keyword, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {keyword}
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyword(i)}
                                className="text-gray-500 hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Images */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
                        >
                          {uploading ? 'Uploading...' : '📷 Upload / Take Photo'}
                        </button>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {facts.images.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt={`Product ${i + 1}`} className="w-full h-20 object-cover rounded border border-gray-200" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(url, i)}
                                className="absolute top-0 right-0 p-1 bg-red-600 text-white text-xs rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    {/* Read-only Attribute Preview */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Attributes (read-only)</h3>
                      <p className="text-xs text-gray-500 mb-3">Edit these in the Attributes tab</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><strong>Brand:</strong> {editableProduct.brand || '—'}</div>
                        <div><strong>Department:</strong> {editableProduct.department || '—'}</div>
                        <div><strong>Category:</strong> {editableProduct.category || '—'}</div>
                        <div><strong>Class:</strong> {editableProduct.class || '—'}</div>
                        <div><strong>Age Group:</strong> {editableProduct.ageGroup || '—'}</div>
                        <div><strong>Gender:</strong> {editableProduct.gender || '—'}</div>
                        <div><strong>Material:</strong> {editableProduct.materialFabric || '—'}</div>
                        <div><strong>Fit:</strong> {editableProduct.fit || '—'}</div>
                        {editableProduct.sportsTeam && <div><strong>Team:</strong> {editableProduct.sportsTeam}</div>}
                        {editableProduct.league && <div><strong>League:</strong> {editableProduct.league}</div>}
                      </div>
                    </div>

                    {/* Generate Section */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-gray-800">Generate Product Copy</h3>
                          <p className="text-sm text-gray-500 mt-1">Create a RetailOps description</p>
                          <p className="text-xs text-gray-400 mt-2">Uses Attributes + Product Facts + Images</p>
                        </div>
                        <a
                          href={`/ai/describe?productId=${editableProduct?.id || ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          More options →
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                          <select
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value)}
                            disabled={generatingInline}
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                          >
                            <option value="Clean">Clean</option>
                            <option value="Hype">Hype</option>
                            <option value="Technical">Technical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
                          <select
                            value={aiLength}
                            onChange={(e) => setAiLength(e.target.value)}
                            disabled={generatingInline}
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                          >
                            <option value="Short">Short</option>
                            <option value="Medium">Medium</option>
                            <option value="Long">Long</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleInlineGenerate}
                        disabled={generatingInline || !editableProduct?.id}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                      >
                        {generatingInline ? 'Generating...' : '✨ Generate with AI'}
                      </button>
                    </div>

                    {/* Saved Descriptions */}
                    {Object.keys(aiDescriptions).length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Saved Product Copy</h4>
                        <p className="text-xs text-gray-500 mb-3">Saved drafts live here. Generate again to create another version.</p>
                        <div className="max-h-96 overflow-y-auto space-y-4">
                          {(Object.entries(aiDescriptions) as [string, AIDescription][]).map(([channel, data]) => (
                            <div key={channel}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-sm font-medium text-indigo-600">{channel}</span>
                                  {data.meta && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      {data.meta.tone} · {data.meta.length}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editableProduct) {
                                      setEditableProduct({
                                        ...editableProduct,
                                        marketing: {
                                          ...editableProduct.marketing,
                                          paragraphDraft: data.text,
                                        },
                                      });
                                      setToastMessage({ text: 'Applied to draft', type: 'success' });
                                    }
                                  }}
                                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  Apply to Product Info
                                </button>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                                {data.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current Draft */}
                    {editableProduct.marketing.paragraphDraft && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Draft</label>
                        <div className="p-3 bg-white rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                          {editableProduct.marketing.paragraphDraft}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <footer className="fixed sm:relative bottom-0 left-0 right-0 sm:flex-shrink-0 px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-t border-gray-200 bg-white shadow-lg sm:shadow-none z-10 space-y-2 sm:space-y-0">
                <div className="flex items-center justify-center sm:justify-start order-2 sm:order-1">
                  {savingState === 'saving' && (
                    <span className="text-xs sm:text-sm text-gray-600 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  )}
                  {savingState === 'saved' && (
                    <span className="text-xs sm:text-sm text-green-600 flex items-center">
                      <svg className="mr-1 h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Saved ✓
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col items-stretch sm:items-end gap-2 order-1 sm:order-2">
                  {!canApprove() && getMissingFields().length > 0 && (
                    <div className="text-xs text-red-600 text-center sm:text-right">
                      Missing: {getMissingFields().join(', ')}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      type="button" 
                      className="flex-1 sm:flex-none bg-white py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 touch-manipulation" 
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={() => saveProduct()}
                      className="flex-1 sm:flex-none inline-flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 touch-manipulation"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={handleApprove}
                      disabled={!canApprove()}
                      className="flex-1 sm:flex-none inline-flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
                      title={!canApprove() ? `Missing: ${getMissingFields().join(', ')}` : 'Approve & mark validated'}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </section>
      </div>
      
      {toastMessage && (
        <Toast 
          message={toastMessage.text} 
          type={toastMessage.type} 
          onClose={() => setToastMessage(null)} 
        />
      )}
    </div>
  );
};

export default ProductEditorV2;
