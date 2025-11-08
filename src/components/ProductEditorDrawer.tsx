import React, { useState, useEffect, ChangeEvent, useRef, useCallback } from 'react';
import { Product } from '../types';
// Replaced mock AI service with Gemini client
import { generateProductMarketing } from '../services/geminiService';
import { mockVocabulary } from '../mockData';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Toast from './Toast';
import Select from './ui/Select';

interface ProductEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved?: (productId: string, updates: Partial<Product>) => void;
}

type ActiveTab = 'core' | 'context' | 'generation' | 'variants' | 'history';

// Helper to clean data for Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;                              // omit undefined (Firestore rejects it)
    if (typeof v === 'string' && v.trim() === '') out[k] = null; // empty -> null
    else out[k] = v;
  }
  return out as Partial<T>;
}

// Mock history data for the new tab
const mockHistory = [
    "Version 3: AI Generation (11/06/2025)",
    "Version 2: Manual Edit by admin@... (11/05/2025)",
    "Version 1: Product Imported (11/04/2025)"
];

const ProductEditorDrawer: React.FC<ProductEditorDrawerProps> = ({ isOpen, onClose, product, onSaved }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('core');
  const [editableProduct, setEditableProduct] = useState<Product | null>(product);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiScore, setAiScore] = useState<{ overall: number; tone: number; seo: number; } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [lastProductId, setLastProductId] = useState<string | null>(product?.id || null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const lastActiveField = useRef<{ name?: string; start?: number; end?: number }>({});

  useEffect(() => {
    // Only reset editableProduct when the product ID changes (not when fields update)
    // This prevents overwriting local typing with every Firestore snapshot
    if (product?.id !== lastProductId) {
      setEditableProduct(product);
      setActiveTab('core');
      setAiScore(null);
      setToastMessage(null);
      setLastProductId(product?.id || null);
      setChangedFields(new Set());
      setSavingState('idle');
    }
  }, [product?.id, lastProductId]); // Sync on ID only, not the entire product object

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (formRef.current) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          formRef.current.dispatchEvent(submitEvent);
        }
        return;
      }

      // Esc: Close drawer
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // A: Approve (only when not typing)
      if (e.key === 'a' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (formRef.current && product) {
          saveFromForm({ preventDefault(){}, currentTarget: formRef.current } as any, {
            status: 'validated',
            validatedAt: serverTimestamp(),
          }, { showToast: 'Approved', keepOpen: true });
        }
        return;
      }

      // Alt + Up/Down: Navigate fields
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const focusableElements = formRef.current?.querySelectorAll(
          'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[role="combobox"]'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;
        
        const currentIndex = Array.from(focusableElements).indexOf(target as Element);
        
        if (currentIndex === -1) {
          // Not currently focused on a field, focus first
          (focusableElements[0] as HTMLElement).focus();
        } else {
          let nextIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % focusableElements.length;
          } else {
            nextIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
          }
          (focusableElements[nextIndex] as HTMLElement).focus();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, product]);

  // Debounced autosave function
  const debouncedAutosave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!product || !editableProduct || changedFields.size === 0) return;

      try {
        setSavingState('saving');
        
        // Build payload with only changed fields
        const payload = cleanForFirestore({
          ...(changedFields.has('name') && { name: editableProduct.name }),
          ...(changedFields.has('brand') && { brand: editableProduct.brand }),
          ...(changedFields.has('mpn') && { mpn: editableProduct.mpn }),
          ...(changedFields.has('status') && { status: editableProduct.status }),
          ...(changedFields.has('department') && { department: editableProduct.department }),
          ...(changedFields.has('class') && { class: editableProduct.class }),
          ...(changedFields.has('category') && { category: editableProduct.category }),
          ...(changedFields.has('ageGroup') && { ageGroup: editableProduct.ageGroup }),
          ...(changedFields.has('gender') && { gender: editableProduct.gender }),
          ...(changedFields.has('materialFabric') && { materialFabric: editableProduct.materialFabric }),
          ...(changedFields.has('fit') && { fit: editableProduct.fit }),
          ...(changedFields.has('websites') && { websites: editableProduct.websites }),
          ...(changedFields.has('featured') && { featured: editableProduct.featured }),
          ...(changedFields.has('map') && { map: editableProduct.map }),
          ...(changedFields.has('promo') && { promo: editableProduct.promo }),
          ...(changedFields.has('hype') && { hype: editableProduct.hype }),
          ...(changedFields.has('fastfashion') && { fastfashion: editableProduct.fastfashion }),
          ...(changedFields.has('league') && { league: editableProduct.league }),
          ...(changedFields.has('sportsTeam') && { sportsTeam: editableProduct.sportsTeam }),
          ...(changedFields.has('aiContext') && { aiContext: editableProduct.aiContext }),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'products', product.id), payload, { merge: true });
        
        // Call onSaved callback for optimistic UI update
        if (onSaved) {
          const filtered = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
          onSaved(product.id, filtered as Partial<Product>);
        }
        
        // Update local editableProduct with filtered merge (preserve fields being typed)
        if (editableProduct) {
          const filtered = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
          // Shallow merge into existing object to preserve any local changes
          setEditableProduct(prev => prev ? { ...prev, ...filtered } : null);
        }

        // Update local editableProduct with filtered merge (preserve fields being typed)
        if (editableProduct) {
          const filtered = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
          // Shallow merge into existing object to preserve any local changes
          setEditableProduct(prev => prev ? { ...prev, ...filtered } : null);
        }

        // Clear changed fields after successful save
        setChangedFields(new Set());
        setSavingState('saved');

        // Reset to idle after 1 second
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          setSavingState('idle');
        }, 1000);

        // Restore focus by field name + caret position
        const restore = () => {
          const { name, start, end } = lastActiveField.current || {};
          if (!name || !formRef.current) return;
          const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
          if (!el) return;
          el.focus();
          if (typeof start === 'number' && typeof end === 'number' && 'setSelectionRange' in el) {
            try { (el as HTMLInputElement).setSelectionRange(start, end); } catch {}
          }
        };
        restore();
      } catch (error) {
        console.error('[drawer] autosave failed', error);
        setSavingState('idle');
      }
    }, 500); // 500ms debounce per requirements
  }, [product, editableProduct, changedFields, onSaved]);

  const saveFromForm = async (e: React.FormEvent<HTMLFormElement>, extra: Record<string, any> = {}, options: { showToast?: string; keepOpen?: boolean } = {}) => {
    e.preventDefault();
    if (!product) return;
    
    // Cancel any pending autosave
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSavingState('saving');
    
    const fd = new FormData(e.currentTarget);
    // Return undefined when a field is missing so cleanForFirestore will drop it;
    // this prevents overwriting existing Firestore values with null inadvertently.
    const get = (k: string) => {
      const v = fd.get(k);
      return v === null ? undefined : (v as string);
    };

    const payload = cleanForFirestore({
      name: get('name') ?? product.name,
      brand: get('brand'),
      mpn: get('mpn') ?? product.mpn,
      status: get('status') || product.status,
      department: get('department'),
      class: get('class'),
      category: get('category'),
      ageGroup: get('ageGroup'),
      gender: get('gender'),
      // core text fields
      materialFabric: get('materialFabric'),
      fit: get('fit'),
      // single value (if you keep it), else remove
      website: get('website'),
      // multi-select from local state (checkboxes)
      websites: editableProduct.websites,
      // flags/toggles (checkboxes submit 'on' when checked)
      featured: (fd.get('featured') as string | null) === 'on' ? true : editableProduct.featured,
      map: (fd.get('map') as string | null) === 'on' ? true : editableProduct.map,
      promo: (fd.get('promo') as string | null) === 'on' ? true : editableProduct.promo,
      hype: (fd.get('hype') as string | null) === 'on' ? true : editableProduct.hype,
      fastfashion: (fd.get('fastfashion') as string | null) === 'on' ? true : editableProduct.fastfashion,
      league: get('league'),
      sportsTeam: get('sportsTeam'),
      // nested AI context (flatten update)
      aiContext: {
        ...editableProduct.aiContext,
        keywords: (fd.get('keywords') ? String(fd.get('keywords')).split('\n').map(s => s.trim()).filter(Boolean) : editableProduct.aiContext.keywords),
        featureBullets: (fd.get('featureBullets') ? String(fd.get('featureBullets')).split('\n').map(s => s.trim()).filter(Boolean) : editableProduct.aiContext.featureBullets),
        designNotes: (fd.get('designNotes') ? String(fd.get('designNotes')) : editableProduct.aiContext.designNotes),
      },
      updatedAt: serverTimestamp(),
      ...extra,
    });

    // Temporary debug: verify outgoing payload (remove before final merge)
    console.log('[drawer] payload to Firestore', payload);

    await setDoc(doc(db, 'products', product.id), payload, { merge: true });
    
    // Call onSaved callback for optimistic UI update in parent
    if (onSaved) {
      const filtered = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
      onSaved(product.id, filtered as Partial<Product>);
    }
    
    // Update local state with filtered merge (avoid overwriting with undefined)
    if (editableProduct) {
      const filtered = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
      // Include any extra fields like status from the options
      const mergedUpdate = {
        ...filtered,
        ...(extra.status && { status: extra.status }),
        ...(extra.validatedAt && { validatedAt: extra.validatedAt }),
      };
      setEditableProduct(prev => prev ? { ...prev, ...mergedUpdate } : null);
    }
    
    // Clear changed fields after manual save
    setChangedFields(new Set());
    setSavingState('saved');
    
    // Reset to idle after 1 second
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => {
      setSavingState('idle');
    }, 1000);
    
    // Restore focus by field name + caret position
    const restore = () => {
      const { name, start, end } = lastActiveField.current || {};
      if (!name || !formRef.current) return;
      const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      el.focus();
      if (typeof start === 'number' && typeof end === 'number' && 'setSelectionRange' in el) {
        try { (el as HTMLInputElement).setSelectionRange(start, end); } catch {}
      }
    };
    restore();
    
    // Show toast if requested
    if (options.showToast) {
      setToastMessage({ text: options.showToast, type: 'success' });
    }
    
    // Close drawer unless keepOpen is true
    if (!options.keepOpen) {
      onClose();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editableProduct) return;
    const { name, value, type } = e.target;
    
    // Capture field name and caret position for focus restoration
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      lastActiveField.current = {
        name: e.target.name,
        start: e.target.selectionStart ?? undefined,
        end: e.target.selectionEnd ?? undefined,
      };
    }
    
    // Track that this field changed
    setChangedFields(prev => new Set(prev).add(name));
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setEditableProduct({ ...editableProduct, [name]: checked });
        return;
    }

    setEditableProduct({ ...editableProduct, [name]: value });
    // Schedule debounced autosave (does not save every keystroke due to debounce)
    debouncedAutosave();
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!editableProduct) return;
    
    // Track that this field changed
    setChangedFields(prev => new Set(prev).add(name));
    
    setEditableProduct({ ...editableProduct, [name]: value });
    // Schedule debounced autosave
    debouncedAutosave();
  };

  const handleBlur = () => {
    // Trigger autosave when field loses focus
    if (changedFields.size > 0) {
      debouncedAutosave();
    }
  };

  const handleWebsiteChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editableProduct) return;
    const { value: websiteName, checked } = e.target;
    
    // Track that websites changed
    setChangedFields(prev => new Set(prev).add('websites'));
    
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
    
    // Autosave on website toggle (debounced)
    debouncedAutosave();
  };

  const handleNestedChange = (
    e: ChangeEvent<HTMLTextAreaElement>,
    section: 'aiContext'
  ) => {
    if (!editableProduct) return;
    const { name, value } = e.target;

    // Capture field name and caret position for focus restoration
    if (e.target instanceof HTMLTextAreaElement) {
      lastActiveField.current = {
        name: e.target.name,
        start: e.target.selectionStart ?? undefined,
        end: e.target.selectionEnd ?? undefined,
      };
    }

    // Track that aiContext changed
    setChangedFields(prev => new Set(prev).add('aiContext'));

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
  // Schedule debounced autosave for context changes
  debouncedAutosave();
  };
  
  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setAiScore(null);
    try {
      if (!editableProduct) return;
      const result = await generateProductMarketing({ product: editableProduct });
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
      setAiScore(result.score);
    } catch (e) {
      console.error('[drawer] AI generation failed', e);
      // Basic fallback toast via optimistic paragraph
      setEditableProduct(p => p ? ({
        ...p,
        marketing: { ...p.marketing, paragraphDraft: p.marketing.paragraphDraft || 'Generation failed.' }
      }) : p);
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
            <form
              ref={formRef}
              className="h-full flex flex-col bg-white shadow-xl"
              onSubmit={(e) => saveFromForm(e)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  e.target instanceof HTMLElement &&
                  (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
                ) {
                  e.preventDefault();
                }
              }}
            >
              <header className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">{editableProduct.name}</h2>
                            <p className="mt-1 text-sm text-gray-500">{editableProduct.brand} - {editableProduct.mpn}</p>
                        </div>
                        {/* Keyboard shortcuts help button */}
                        <div className="relative">
                            <button
                                type="button"
                                onMouseEnter={() => setShowShortcuts(true)}
                                onMouseLeave={() => setShowShortcuts(false)}
                                onClick={() => setShowShortcuts(!showShortcuts)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                title="Keyboard shortcuts"
                            >
                                <span className="text-sm font-bold">?</span>
                            </button>
                            {showShortcuts && (
                                <div className="absolute left-0 top-8 z-50 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                    <h3 className="font-semibold mb-2 text-sm">Keyboard Shortcuts</h3>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Cmd/Ctrl + S</span>
                                            <span>Save</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">A</span>
                                            <span>Approve</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Esc</span>
                                            <span>Close</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Alt + ↑/↓</span>
                                            <span>Navigate fields</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                        <TabButton tabName="history" label="History" />
                    </div>
                </nav>

              <div className="relative flex-1 p-6 overflow-y-auto">
                {activeTab === 'core' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                             <FormField label="Name"><input name="name" type="text" value={editableProduct.name} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="MPN"><input name="mpn" type="text" value={editableProduct.mpn} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="Brand"><input type="text" name="brand" value={editableProduct.brand} onChange={handleInputChange} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                             
                             <FormField label="Department">
                               <Select 
                                 name="department"
                                 value={editableProduct.department} 
                                 onChange={(val) => handleSelectChange('department', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.departments} 
                               />
                             </FormField>
                             <FormField label="Class">
                               <Select 
                                 name="class"
                                 value={editableProduct.class} 
                                 onChange={(val) => handleSelectChange('class', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.classes} 
                               />
                             </FormField>
                             <FormField label="Category">
                               <Select 
                                 name="category"
                                 value={editableProduct.category} 
                                 onChange={(val) => handleSelectChange('category', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.categories} 
                               />
                             </FormField>
                             <FormField label="Age Group">
                               <Select 
                                 name="ageGroup"
                                 value={editableProduct.ageGroup} 
                                 onChange={(val) => handleSelectChange('ageGroup', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.ageGroups} 
                               />
                             </FormField>
                             <FormField label="Gender">
                               <Select 
                                 name="gender"
                                 value={editableProduct.gender} 
                                 onChange={(val) => handleSelectChange('gender', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.genders} 
                               />
                             </FormField>
                             
                             <FormField label="Material/Fabric">
                               <Select 
                                 name="materialFabric"
                                 value={editableProduct.materialFabric} 
                                 onChange={(val) => handleSelectChange('materialFabric', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...mockVocabulary.materials]}
                                 placeholder="Select material..."
                               />
                             </FormField>
                             <FormField label="Fit">
                               <Select 
                                 name="fit"
                                 value={editableProduct.fit} 
                                 onChange={(val) => handleSelectChange('fit', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...mockVocabulary.fits]}
                                 placeholder="Select fit..."
                               />
                             </FormField>

                             <FormField label="Sports Team">
                               <Select 
                                 name="sportsTeam"
                                 value={editableProduct.sportsTeam || ''} 
                                 onChange={(val) => handleSelectChange('sportsTeam', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...mockVocabulary.sportsTeams]}
                                 placeholder="None"
                               />
                             </FormField>
                             <FormField label="League">
                               <Select 
                                 name="league"
                                 value={editableProduct.league || ''} 
                                 onChange={(val) => handleSelectChange('league', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...mockVocabulary.leagues]}
                                 placeholder="None"
                               />
                             </FormField>

                             <FormField label="Status">
                               <Select 
                                 name="status"
                                 value={editableProduct.status} 
                                 onChange={(val) => handleSelectChange('status', val)} 
                                 onBlur={handleBlur}
                                 options={mockVocabulary.statuses as readonly string[]} 
                               />
                             </FormField>
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
                        <FormField label="Keywords (one per line)"><textarea name="keywords" value={editableProduct.aiContext.keywords.join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Feature Bullets (one per line)"><textarea name="featureBullets" value={editableProduct.aiContext.featureBullets.join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Design Notes"><textarea name="designNotes" value={editableProduct.aiContext.designNotes} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={6} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                    </div>
                )}
                {activeTab === 'generation' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button type="button" onClick={handleGenerateClick} disabled={isGenerating} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                            </button>
                        </div>

                         {aiScore && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="text-md font-semibold text-gray-800">AI Quality Score</h3>
                                <div className="flex items-baseline mt-2">
                                    <p className="text-4xl font-bold text-indigo-600">{aiScore.overall}</p>
                                    <p className="text-xl text-gray-500">/10</p>
                                </div>
                            </div>
                        )}

                        <FormField label="Generated Title"><div className="p-2 bg-gray-100 rounded-md min-h-[40px]">{editableProduct.marketing.title}</div></FormField>
                        <FormField label="Generated Bullets"><ul className="p-2 pl-6 bg-gray-100 rounded-md min-h-[80px] list-disc space-y-1">{editableProduct.marketing.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul></FormField>
                        <FormField label="Generated SEO Description"><div className="p-2 bg-gray-100 rounded-md min-h-[60px]">{editableProduct.marketing.seo}</div></FormField>
                        <FormField label="Generated Paragraph Draft"><div className="p-2 bg-gray-100 rounded-md min-h-[120px] whitespace-pre-wrap">{editableProduct.marketing.paragraphDraft}</div></FormField>
                        <div className="flex justify-end pt-4">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              const form = (e.currentTarget as HTMLButtonElement).closest('form')!;
                              saveFromForm({ preventDefault(){}, currentTarget: form } as any, {
                                status: 'validated',
                                validatedAt: serverTimestamp(),
                              });
                            }}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </button>
                        </div>
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
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Product Change History</h3>
                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                           {mockHistory.map((entry, index) => (
                                <li key={index} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                                    <span className="text-sm text-gray-700">{entry}</span>
                                    <button
                                        type="button"
                                        className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Restore
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
              
              <footer className="flex-shrink-0 px-4 py-4 flex justify-between items-center border-t border-gray-200 bg-gray-50">
                {/* Saving indicator */}
                <div className="flex items-center">
                  {savingState === 'saving' && (
                    <span className="text-sm text-gray-600 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  )}
                  {savingState === 'saved' && (
                    <span className="text-sm text-green-600 flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Saved ✓
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
                  {activeTab === 'core' ? (
                    <>
                      <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          const form = (e.currentTarget as HTMLButtonElement).closest('form')!;
                          saveFromForm({ preventDefault(){}, currentTarget: form } as any, {
                            status: 'validated',
                            validatedAt: serverTimestamp(),
                          }, { showToast: 'Approved', keepOpen: true });
                        }}
                        className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                  )}
                </div>
              </footer>
            </form>
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

export default ProductEditorDrawer;