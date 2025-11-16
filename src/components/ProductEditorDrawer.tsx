import React, { useState, useEffect, ChangeEvent, useRef, useCallback } from 'react';
import { Product, ProductFacts } from '../types';
// Replaced mock AI service with Gemini client
import { generateProductMarketing } from '../services/geminiService';
import { describeProduct } from '../services/describe';
import { mockVocabulary } from '../mockData';
import { db, storage } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Toast from './Toast';
import Select from './ui/Select';
import { useVocab } from '../hooks/useVocab';
import { useAttributesSettings } from '../hooks/useAttributesSettings';

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


// --- MOVED HELPER COMPONENTS ---
// Defining these outside the main component prevents them
// from being recreated on every render, which fixes the focus loss.

const TabButton: React.FC<{
  tabName: ActiveTab;
  label: string;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}> = ({ tabName, label, activeTab, setActiveTab }) => (
  <button
    type="button" // Prevent form submission
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

// --- MAIN COMPONENT ---

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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [madeInSelections, setMadeInSelections] = useState<string[]>([]);
  
  // Live vocabulary from Firestore
  const vocab = useVocab();
  const attributes = useAttributesSettings();
  
  // AI Descriptions from subcollection
  type AIDescription = { text: string; meta?: { tone: string; length: string; generatedAt: any } };
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, AIDescription>>({});
  
  // Inline AI generation controls
  const [aiChannel, setAiChannel] = useState('RetailOps');
  const [aiTone, setAiTone] = useState('Clean');
  const [aiLength, setAiLength] = useState('Medium');
  const [generatingInline, setGeneratingInline] = useState(false);

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
  const [factsFirstSave, setFactsFirstSave] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [brandCheatSheet, setBrandCheatSheet] = useState<any>(null);
  const [cheatSheetExpanded, setCheatSheetExpanded] = useState(false);
  const factsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Related Colors state
  const [relatedColors, setRelatedColors] = useState<Product[]>([]);
  const [loadingRelatedColors, setLoadingRelatedColors] = useState(false);

  // Helper to restore focus by field name + caret position
  const restoreFocus = useCallback(() => {
    const { name, start, end } = lastActiveField.current || {};
    if (!name || !formRef.current) return;
    const el = formRef.current.elements.namedItem(name) as (HTMLInputElement | HTMLTextAreaElement | null);
    if (!el) return;
    el.focus();
    if (typeof start === 'number' && typeof end === 'number' && 'setSelectionRange' in el) {
      try { (el as HTMLInputElement).setSelectionRange(start, end); } catch {}
    }
  }, []);

  // Sync local state only when product.id changes
  useEffect(() => {
    setEditableProduct(product);
  }, [product?.id]);

  // Load AI descriptions from subcollection
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
        console.error('[drawer] Failed to load AI descriptions:', error);
      }
    };

    loadDescriptions();
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
      setFactsFirstSave(true);
      return;
    }

    const loadFacts = async () => {
      try {
        const factsRef = doc(db, 'products', product.id, 'facts', 'data');
        const snapshot = await getDoc(factsRef);
        
        if (snapshot.exists()) {
          setFacts(snapshot.data() as ProductFacts);
          setFactsFirstSave(false);
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
          setFactsFirstSave(true);
        }
      } catch (error) {
        console.error('[drawer] Failed to load facts:', error);
      }
    };

    loadFacts();
  }, [product?.id]);

  // Load Brand Cheat Sheet
  useEffect(() => {
    if (!product?.brand) {
      setBrandCheatSheet(null);
      return;
    }

    const loadCheatSheet = async () => {
      try {
        const cheatRef = doc(db, 'brand_rules', product.brand, 'commonFacts', 'data');
        const snapshot = await getDoc(cheatRef);
        
        if (snapshot.exists()) {
          setBrandCheatSheet(snapshot.data());
        } else {
          setBrandCheatSheet(null);
        }
      } catch (error) {
        console.error('[drawer] Failed to load brand cheat sheet:', error);
        setBrandCheatSheet(null);
      }
    };

    loadCheatSheet();
  }, [product?.brand]);

  // Load Related Colors when Style ID is present
  useEffect(() => {
    const styleId = editableProduct?.style?.id?.trim();
    
    if (!styleId || !product?.id) {
      setRelatedColors([]);
      return;
    }

    const loadRelatedColors = async () => {
      try {
        setLoadingRelatedColors(true);
        
        // Query products with same style.id but different product ID
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef,
          where('style.id', '==', styleId)
        );
        
        const snapshot = await getDocs(q);
        const related: Product[] = [];
        
        snapshot.forEach((doc) => {
          if (doc.id !== product.id) { // Exclude current product
            const data = doc.data();
            related.push({ id: doc.id, ...data } as Product);
          }
        });
        
        setRelatedColors(related);
      } catch (error) {
        console.error('[drawer] Failed to load related colors:', error);
        setRelatedColors([]);
      } finally {
        setLoadingRelatedColors(false);
      }
    };

    loadRelatedColors();
  }, [editableProduct?.style?.id, product?.id]);

  // Inline AI generation handler
  const handleInlineGenerate = async () => {
    if (!editableProduct?.id) {
      setToastMessage({ text: 'Product ID required', type: 'error' });
      return;
    }

    try {
      setGeneratingInline(true);
      
      // Always use RetailOps channel for primary inline generation
      const channel = 'RetailOps';
      
      // Call describeProduct service with facts, aiContext, attributes, and first image if available
      const result = await describeProduct({
        productId: editableProduct.id,
        channel,
        tone: aiTone,
        length: aiLength,
        facts,                                  // from facts state/doc
        aiContext: editableProduct.aiContext,   // keywords, featureBullets, designNotes
        attributes: {
          brand: editableProduct.brand,
          category: editableProduct.category,
          gender: editableProduct.gender,
          ageGroup: editableProduct.ageGroup,
          price: (editableProduct as any).price ?? null,
          styleId: editableProduct.style?.id || null,
          launchDate: editableProduct.launch?.date || null
        },
        imageUrl: facts.images[0] // first image if available
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
      setChangedFields(prev => new Set(prev).add('marketing.paragraphDraft'));

      // Reload descriptions to show the new one
      const descriptionsRef = collection(db, 'products', editableProduct.id, 'descriptions');
      const snapshot = await getDocs(descriptionsRef);
      const descriptions: Record<string, AIDescription> = {};
      
      snapshot.forEach((doc) => {
        descriptions[doc.id] = doc.data() as AIDescription;
      });
      
      setAiDescriptions(descriptions);
      setToastMessage({ text: 'Generated and applied to Product Info', type: 'success' });
    } catch (error: any) {
      console.error('[drawer] Inline generation failed:', error);
      setToastMessage({ text: error?.message || 'Failed to generate description', type: 'error' });
    } finally {
      setGeneratingInline(false);
    }
  };

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
      
      if (factsFirstSave) {
        setToastMessage({ text: 'Product information saved', type: 'success' });
        setFactsFirstSave(false);
      }
    } catch (error) {
      console.error('[drawer] Failed to save facts:', error);
      setToastMessage({ text: 'Failed to save product information', type: 'error' });
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
      console.error('[drawer] Image upload failed:', error);
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
      // Delete from Storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      
      // Update facts
      const updated = { ...facts, images: facts.images.filter((_, i) => i !== index) };
      setFacts(updated);
      await saveFacts(updated);
      
      setToastMessage({ text: 'Image removed', type: 'success' });
    } catch (error) {
      console.error('[drawer] Failed to remove image:', error);
      setToastMessage({ text: 'Failed to remove image', type: 'error' });
    }
  };

  // Copy from brand cheat sheet
  const handleCopyFromCheatSheet = (field: keyof ProductFacts, value: string) => {
    const updated = { ...facts, [field]: value };
    setFacts(updated);
    saveFacts(updated);
    setToastMessage({ text: `Copied to ${field}`, type: 'success' });
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      if (factsTimeoutRef.current) clearTimeout(factsTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Cmd/Ctrl + S: Save from state
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFromForm();
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
        handleApprove();
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

  // Temporarily disable idle autosave for stability
  const debouncedAutosave = useCallback(() => {
    if (!editableProduct) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSavingState('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveFromForm({
          // Ensure nested descriptive.madeIn is persisted on autosave
          ...(madeInSelections.length ? { descriptive: { madeIn: madeInSelections } as any } : {}),
        }, { showToast: 'Draft saved', keepOpen: true });
        setLastSavedAt(new Date());
      } finally {
        // savingState handled in saveFromForm, but ensure idle if anything goes wrong
        if (!saveTimeoutRef.current) setSavingState('idle');
      }
    }, 1500);
  }, [editableProduct, madeInSelections]);

  const saveFromForm = async (extra: Partial<Product> & { validatedAt?: any } = {}, options?: { showToast?: string; keepOpen?: boolean }) => {
    if (!product || !editableProduct) return;

    // Cancel any pending autosave
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingState('saving');

    const p = editableProduct;

    // Build minimal payload from state
    const base: Partial<Product> & { updatedAt?: any } = {
      brand: p.brand,
      status: p.status ?? product.status,
      department: p.department,
      class: p.class,
      category: p.category,
      ageGroup: p.ageGroup,
      gender: p.gender,
      materialFabric: p.materialFabric,
      materials: p.materials,
      fit: p.fit,
      primaryColor: p.primaryColor,
      descriptiveColor: p.descriptiveColor,
      cutType: p.cutType,
      closureType: p.closureType,
      heelHeight: p.heelHeight,
      heelType: p.heelType,
      platformHeight: p.platformHeight,
      sportsTeam: p.sportsTeam,
      league: p.league,
      websites: p.websites,
      featured: p.featured,
      
      // Core product fields
      isActive: p.isActive ?? true,
      coreProduct: p.coreProduct,
      productGroup: p.productGroup,
      notes: p.notes,
      
      // Legacy flags (deprecated but kept for compatibility)
      map: p.map,
      promo: p.promo,
      hype: p.hype,
      fastfashion: p.fastfashion,
      familySizing: p.familySizing,
      
      // Nested structures
      price: p.price,
      launch: p.launch,
      shipping: p.shipping,
      dimensions: p.dimensions,
      style: p.style,
      tax: p.tax,
      media: p.media,
      
      aiContext: p.aiContext,
      keywords: p.keywords,
      updatedAt: serverTimestamp(),
    };

    // Only include name/mpn if the user changed them (we don't change them in UI today)
    if (p.name && p.name !== product.name) (base as any).name = p.name;
    if (p.mpn && p.mpn !== product.mpn) (base as any).mpn = p.mpn;

    // Merge extra fields (like marketing, status from Approve)
    const payload = cleanForFirestore<any>({
      ...base,
      // Persist new collection selection
      launch: {
        ...base.launch,
        ...(editableProduct.launch?.newCollection ? { newCollection: editableProduct.launch?.newCollection } : {}),
      },
      // Persist Made In selections under descriptive
      ...(madeInSelections.length ? { descriptive: { madeIn: madeInSelections } as any } : {}),
      ...extra,
    });
    console.log('[drawer] payload to Firestore (STATE)', payload);

    await setDoc(doc(db, 'products', product.id), payload, { merge: true });

    // Optimistic merge back into local drawer state (skip undefined)
    setEditableProduct(prev => prev ? ({
      ...prev,
      ...Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)),
    }) : null);

    onSaved?.(product.id, payload);

    // Clear changed fields after manual save
    setChangedFields(new Set());
    setSavingState('saved');
    setLastSavedAt(new Date());

    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => {
      setSavingState('idle');
    }, 1000);

    // Restore focus
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

    if (options?.showToast) setToastMessage({ text: options.showToast, type: 'success' });

    if (!options?.keepOpen) {
      onClose();
    }
  };

  // Runtime guard during dev builds
  if (process.env.NODE_ENV !== 'production') {
    (window as any).__ROPIV2_EDITOR_USING_STATE__ = true;
  }

  // Prevent regressions: if someone reintroduces FormData here we'll see it
  // (Keep this comment; do not use FormData in this component.)
  if (typeof FormData !== 'undefined') {
    // FormData is available globally but we never use it in saveFromForm
  }

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
  }, [editableProduct, debouncedAutosave]);

  const handleSelectChange = useCallback((name: string, value: string) => {
    if (!editableProduct) return;
    
    // Track that this field changed
    setChangedFields(prev => new Set(prev).add(name));
    
    setEditableProduct({ ...editableProduct, [name]: value });
    // Schedule debounced autosave
    debouncedAutosave();
  }, [editableProduct, debouncedAutosave]);

  const handleBlur = useCallback(() => {
    // Trigger autosave when field loses focus
    if (changedFields.size > 0) {
      debouncedAutosave();
    }
  }, [changedFields, debouncedAutosave]);

  const handleWebsiteChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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
  }, [editableProduct, debouncedAutosave]);

  const handleNestedChange = useCallback((
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
  }, [editableProduct, debouncedAutosave]);
  
  const handleGenerateClick = useCallback(async () => {
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
  }, [editableProduct]);

  // Check if product is ready to approve
  const canApprove = useCallback(() => {
    if (!editableProduct) return false;
    
    // Required fields
    const hasName = !!editableProduct.name?.trim();
    const hasBrand = !!editableProduct.brand?.trim();
    const hasCategory = !!editableProduct.category?.trim();
    
    // Need at least one of: paragraphDraft or a saved AI description
    const hasDraft = !!editableProduct.marketing.paragraphDraft?.trim();
    const hasSavedDescription = Object.keys(aiDescriptions).length > 0;
    const hasDescription = hasDraft || hasSavedDescription;
    
    return hasName && hasBrand && hasCategory && hasDescription;
  }, [editableProduct, aiDescriptions]);

  // Get missing fields for approval
  const getMissingFields = useCallback(() => {
    if (!editableProduct) return [];
    const missing: string[] = [];
    
    if (!editableProduct.name?.trim()) missing.push('Name');
    if (!editableProduct.brand?.trim()) missing.push('Brand');
    if (!editableProduct.category?.trim()) missing.push('Category');
    
    const hasDraft = !!editableProduct.marketing.paragraphDraft?.trim();
    const hasSavedDescription = Object.keys(aiDescriptions).length > 0;
    if (!hasDraft && !hasSavedDescription) {
      missing.push('Marketing Description (generate or apply a saved description)');
    }
    
    return missing;
  }, [editableProduct, aiDescriptions]);

  // Handle Approve action
  const handleApprove = useCallback(async () => {
    if (!editableProduct || !product) return;
    
    // Check if ready to approve
    const missing = getMissingFields();
    if (missing.length > 0) {
      setToastMessage({ 
        text: `Cannot approve: Missing ${missing.join(', ')}`, 
        type: 'error' 
      });
      return;
    }
    
    // Determine final description
    let finalDescription = editableProduct.marketing.paragraphDraft || '';
    
    // If no draft but we have saved descriptions, use the first one
    if (!finalDescription && Object.keys(aiDescriptions).length > 0) {
      const firstChannel = Object.keys(aiDescriptions)[0];
      finalDescription = aiDescriptions[firstChannel].text;
    }
    
    // Save with validated status and final description
    await saveFromForm(
      { 
        status: 'validated',
        marketing: {
          ...editableProduct.marketing,
          paragraphFinal: finalDescription,
        },
      },
      { showToast: 'Approved & ready to export', keepOpen: true }
    );
  }, [editableProduct, product, aiDescriptions, getMissingFields, saveFromForm]);


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
              onSubmit={(e) => { e.preventDefault(); saveFromForm(); }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  e.target instanceof HTMLElement &&
                  (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
                ) {
                  e.preventDefault();
                }

                // Cmd/Ctrl + S: Save from state
                if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                  e.preventDefault();
                  saveFromForm();
                  return;
                }

                // A: Approve (only when not typing)
                const target = e.target as HTMLElement;
                const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                if (e.key === 'a' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
                  e.preventDefault();
                  handleApprove();
                  return;
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
                        <TabButton tabName="core" label="Core Information" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton tabName="context" label="Product Information" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton tabName="generation" label="AI Product Copy" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton tabName="variants" label="Variants" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton tabName="history" label="History" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>
                </nav>

              <div className="relative flex-1 p-6 overflow-y-auto">
                {activeTab === 'core' && (
                    <div className="space-y-6">
                        {vocab.loading && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                Loading vocabulary...
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                             <FormField label="Name"><input name="name" type="text" value={editableProduct.name ?? ''} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="MPN"><input name="mpn" type="text" value={editableProduct.mpn ?? ''} readOnly className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" /></FormField>
                             <FormField label="Brand"><input type="text" name="brand" value={editableProduct.brand ?? ''} onChange={handleInputChange} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} disabled={vocab.loading} className="block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100" /></FormField>
                             
                             <FormField label="Department">
                               <Select 
                                 name="department"
                                 value={editableProduct.department ?? ''} 
                                 onChange={(val) => handleSelectChange('department', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.departments.map(v => v.value)}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Class">
                               <Select 
                                 name="class"
                                 value={editableProduct.class ?? ''} 
                                 onChange={(val) => handleSelectChange('class', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.classes.map(v => v.value)}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Category">
                               <Select 
                                 name="category"
                                 value={editableProduct.category ?? ''} 
                                 onChange={(val) => handleSelectChange('category', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.categories.map(v => v.value)}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Age Group">
                               <Select 
                                 name="ageGroup"
                                 value={editableProduct.ageGroup ?? ''} 
                                 onChange={(val) => handleSelectChange('ageGroup', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.ageGroups.map(v => v.value)}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Gender">
                               <Select 
                                 name="gender"
                                 value={editableProduct.gender ?? ''} 
                                 onChange={(val) => handleSelectChange('gender', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.genders.map(v => v.value)}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             
                             <FormField label="Material/Fabric">
                               <Select 
                                 name="materialFabric"
                                 value={editableProduct.materialFabric ?? ''} 
                                 onChange={(val) => handleSelectChange('materialFabric', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.materials.map(v => v.value)]}
                                 placeholder="Select material..."
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Fit">
                               <Select 
                                 name="fit"
                                 value={editableProduct.fit ?? ''} 
                                 onChange={(val) => handleSelectChange('fit', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.fits.map(v => v.value)]}
                                 placeholder="Select fit..."
                                 disabled={vocab.loading}
                               />
                             </FormField>

                             <FormField label="Primary Color">
                               <Select 
                                 name="primaryColor"
                                 value={editableProduct.primaryColor ?? ''} 
                                 onChange={(val) => handleSelectChange('primaryColor', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.primaryColors.map(v => v.value)]}
                                 placeholder="Select color..."
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Descriptive Color">
                               <input 
                                 type="text" 
                                 name="descriptiveColor" 
                                 value={editableProduct.descriptiveColor ?? ''} 
                                 onChange={handleInputChange} 
                                 onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} 
                                 onBlur={handleBlur} 
                                 disabled={vocab.loading} 
                                 placeholder="e.g., Midnight Navy"
                                 className="block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100" 
                               />
                             </FormField>

                             <FormField label="Cut Type">
                               <Select 
                                 name="cutType"
                                 value={editableProduct.cutType ?? ''} 
                                 onChange={(val) => handleSelectChange('cutType', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.cutTypes.map(v => v.value)]}
                                 placeholder="Select cut type..."
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Closure Type">
                               <Select 
                                 name="closureType"
                                 value={editableProduct.closureType ?? ''} 
                                 onChange={(val) => handleSelectChange('closureType', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.closureTypes.map(v => v.value)]}
                                 placeholder="Select closure..."
                                 disabled={vocab.loading}
                               />
                             </FormField>

                             <FormField label="Heel Height">
                               <Select 
                                 name="heelHeight"
                                 value={editableProduct.heelHeight ?? ''} 
                                 onChange={(val) => handleSelectChange('heelHeight', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.heelHeights.map(v => v.value)]}
                                 placeholder="Select height..."
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Heel Type">
                               <Select 
                                 name="heelType"
                                 value={editableProduct.heelType ?? ''} 
                                 onChange={(val) => handleSelectChange('heelType', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.heelTypes.map(v => v.value)]}
                                 placeholder="Select heel type..."
                                 disabled={vocab.loading}
                               />
                             </FormField>

                             <FormField label="Platform Height">
                               <Select 
                                 name="platformHeight"
                                 value={editableProduct.platformHeight ?? ''} 
                                 onChange={(val) => handleSelectChange('platformHeight', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.platformHeights.map(v => v.value)]}
                                 placeholder="Select platform..."
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="Sole Material">
                               <Select 
                                 name="style.soleMaterial"
                                 value={editableProduct.style?.soleMaterial ?? ''} 
                                 onChange={(val) => {
                                   setEditableProduct({
                                     ...editableProduct,
                                     style: { ...editableProduct.style, soleMaterial: val }
                                   });
                                   setChangedFields(prev => new Set(prev).add('style.soleMaterial'));
                                   debouncedAutosave();
                                 }} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.soleMaterials.map(v => v.value)]}
                                 placeholder="Select sole material..."
                                 disabled={vocab.loading}
                               />
                             </FormField>

                             <FormField label="Sports Team">
                               <Select 
                                 name="sportsTeam"
                                 value={editableProduct.sportsTeam ?? ''} 
                                 onChange={(val) => handleSelectChange('sportsTeam', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.sportsTeams.map(v => v.value)]}
                                 placeholder="None"
                                 disabled={vocab.loading}
                               />
                             </FormField>
                             <FormField label="League">
                               <Select 
                                 name="league"
                                 value={editableProduct.league ?? ''} 
                                 onChange={(val) => handleSelectChange('league', val)} 
                                 onBlur={handleBlur}
                                 options={['', ...vocab.leagues.map(v => v.value)]}
                                 placeholder="None"
                                 disabled={vocab.loading}
                               />
                             </FormField>

                             <FormField label="Status">
                               <Select 
                                 name="status"
                                 value={editableProduct.status ?? ''} 
                                 onChange={(val) => handleSelectChange('status', val)} 
                                 onBlur={handleBlur}
                                 options={vocab.statuses.map(v => v.value) as readonly string[]}
                                 disabled={vocab.loading}
                               />
                             </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                          <FormField label="Websites">
                            <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                              {vocab.loading ? (
                                <div className="text-sm text-gray-500">Loading...</div>
                              ) : (
                                vocab.websites.map(website => (
                                  <div key={website.value} className="flex items-center">
                                    <input id={`website-${website.value}`} type="checkbox" value={website.value} checked={editableProduct.websites.includes(website.value)} onChange={handleWebsiteChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor={`website-${website.value}`} className="ml-2 block text-sm text-gray-900">{website.label}</label>
                                  </div>
                                ))
                              )}
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
                           <FormField label="Family Sizing">
                              <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                                <div className="flex items-center">
                                  <input id="familySizing" name="familySizing" type="checkbox" checked={editableProduct.familySizing ?? false} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                  <label htmlFor="familySizing" className="ml-2 block text-sm text-gray-900">Family sizing available</label>
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
                                <div className="flex items-center">
                                  <input id="familySizingFlag" name="familySizing" type="checkbox" checked={editableProduct.familySizing ?? false} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                  <label htmlFor="familySizingFlag" className="ml-3 block text-sm font-medium text-gray-900">Family sizing available</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="isActive" name="isActive" type="checkbox" checked={editableProduct.isActive ?? true} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="isActive" className="ml-3 block text-sm font-medium text-gray-900">Product Active</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="coreProduct" name="coreProduct" type="checkbox" checked={editableProduct.coreProduct ?? false} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label htmlFor="coreProduct" className="ml-3 block text-sm font-medium text-gray-900">Core Product</label>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-md font-medium text-gray-900 mb-4">Pricing</h3>
                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <FormField label="RICS Retail (Required)">
                                    <input 
                                        type="number" 
                                        name="price.ricsRetail" 
                                        value={editableProduct.price?.ricsRetail ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : 0;
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, ricsRetail: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.ricsRetail'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="RICS Offer">
                                    <input 
                                        type="number" 
                                        name="price.ricsOffer" 
                                        value={editableProduct.price?.ricsOffer ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, ricsOffer: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.ricsOffer'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="MAP Price">
                                    <input 
                                        type="number" 
                                        name="price.map" 
                                        value={editableProduct.price?.map ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, map: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.map'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="Promo Code">
                                    <input 
                                        type="text" 
                                        name="price.promo" 
                                        value={editableProduct.price?.promo ?? ''} 
                                        onChange={(e) => {
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, promo: e.target.value }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.promo'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        placeholder="PROMO2025"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="SCOM Regular">
                                    <input 
                                        type="number" 
                                        name="price.scomRegular" 
                                        value={editableProduct.price?.scomRegular ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, scomRegular: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.scomRegular'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="SCOM Sale">
                                    <input 
                                        type="number" 
                                        name="price.scomSale" 
                                        value={editableProduct.price?.scomSale ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                            setEditableProduct({
                                                ...editableProduct,
                                                price: { ...editableProduct.price, scomSale: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('price.scomSale'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="Use SCOM Prices">
                                    <div className="flex items-center h-full">
                                        <input 
                                            id="scomOverride" 
                                            name="price.scomOverride" 
                                            type="checkbox" 
                                            checked={editableProduct.price?.scomOverride ?? false} 
                                            onChange={(e) => {
                                                setEditableProduct({
                                                    ...editableProduct,
                                                    price: { ...editableProduct.price, scomOverride: e.target.checked }
                                                });
                                                setChangedFields(prev => new Set(prev).add('price.scomOverride'));
                                                debouncedAutosave();
                                            }}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded" 
                                        />
                                        <label htmlFor="scomOverride" className="ml-3 block text-sm text-gray-700">Override with SCOM prices</label>
                                    </div>
                                </FormField>
                            </div>
                        </div>

                        {/* Additional Product Info */}
                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-md font-medium text-gray-900 mb-4">Additional Information</h3>
                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <FormField label="Product Group">
                                    <input 
                                        type="text" 
                                        name="productGroup" 
                                        value={editableProduct.productGroup ?? ''} 
                                        onChange={handleInputChange}
                                        onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }}
                                        onBlur={handleBlur}
                                        placeholder="e.g., Air Max Family"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="Style ID (Optional)">
                                    <input 
                                        type="text" 
                                        name="style.id" 
                                        value={editableProduct.style?.id ?? ''} 
                                        onChange={(e) => {
                                            setEditableProduct({
                                                ...editableProduct,
                                                style: { ...editableProduct.style, id: e.target.value }
                                            });
                                            setChangedFields(prev => new Set(prev).add('style.id'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        placeholder="Use same ID across colorways"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Use same ID across colorways to link related products</p>
                                </FormField>
                                <FormField label="Launch Date">
                                    <input 
                                        type="date" 
                                        name="launch.date" 
                                        value={editableProduct.launch?.date ? new Date(editableProduct.launch.date).toISOString().split('T')[0] : ''} 
                                        onChange={(e) => {
                                            setEditableProduct({
                                                ...editableProduct,
                                                launch: { ...editableProduct.launch, date: e.target.value || null }
                                            });
                                            setChangedFields(prev => new Set(prev).add('launch.date'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                                <FormField label="Hide Image Date">
                                    <input 
                                        type="datetime-local" 
                                        name="media.hideImageDate" 
                                        value={editableProduct.media?.hideImageDate ? new Date(editableProduct.media.hideImageDate).toISOString().slice(0, 16) : ''} 
                                        onChange={(e) => {
                                            setEditableProduct({
                                                ...editableProduct,
                                                media: { ...editableProduct.media, hideImageDate: e.target.value || null }
                                            });
                                            setChangedFields(prev => new Set(prev).add('media.hideImageDate'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Embargo date when images should be hidden</p>
                                </FormField>
                                <FormField label="Tax Class">
                                    <Select 
                                        name="tax.class"
                                        value={editableProduct.tax?.class ?? ''} 
                                        onChange={(val) => {
                                            setEditableProduct({
                                                ...editableProduct,
                                                tax: { ...editableProduct.tax, class: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('tax.class'));
                                            debouncedAutosave();
                                        }} 
                                        onBlur={handleBlur}
                                        options={['', ...vocab.taxClasses.map(v => v.value)]}
                                        placeholder="Select tax class..."
                                        disabled={vocab.loading}
                                    />
                                </FormField>
                                {/* Attributes: New Collection & Made In */}
                                <FormField label="New Collection">
                                  <Select
                                    name="launch.newCollection"
                                    value={editableProduct.launch?.newCollection ?? ''}
                                    onChange={(val) => {
                                      setEditableProduct({
                                        ...editableProduct,
                                        launch: { ...editableProduct.launch, newCollection: val },
                                      });
                                      setChangedFields(prev => new Set(prev).add('launch.newCollection'));
                                      debouncedAutosave();
                                    }}
                                    onBlur={handleBlur}
                                    options={[
                                      '',
                                      ...((attributes.data.collections || []).map(v => v))
                                    ] as readonly string[]}
                                    placeholder="Select a collection..."
                                    disabled={attributes.loading}
                                  />
                                </FormField>
                                <FormField label="Made In (multi-select)">
                                  <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                                    {attributes.loading ? (
                                      <div className="text-sm text-gray-500">Loading...</div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {(attributes.data.madeIn || []).map((country) => {
                                          const selected = madeInSelections.includes(country);
                                          return (
                                            <button
                                              type="button"
                                              key={country}
                                              onClick={() => {
                                                setMadeInSelections(prev => {
                                                  const set = new Set(prev);
                                                  if (set.has(country)) set.delete(country); else set.add(country);
                                                  return Array.from(set);
                                                });
                                                setChangedFields(prev => new Set(prev).add('descriptive.madeIn'));
                                                debouncedAutosave();
                                              }}
                                              className={`px-2 py-1 rounded-full text-xs border ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                              aria-pressed={selected}
                                            >
                                              {country}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </FormField>
                            </div>
                        </div>

                        {/* SEO & Media Section */}
                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-md font-medium text-gray-900 mb-4">SEO & Media</h3>
                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <FormField label="Meta Name (SEO Title)" className="sm:col-span-2">
                                    <input 
                                        type="text" 
                                        name="metaName" 
                                        value={editableProduct.marketing?.title ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditableProduct({
                                                ...editableProduct,
                                                marketing: { ...editableProduct.marketing, title: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('marketing.title'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        maxLength={60}
                                        placeholder="Optimized product title for search engines (≤60 chars)"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {(editableProduct.marketing?.title ?? '').length}/60 characters
                                    </p>
                                </FormField>
                                <FormField label="Meta Description" className="sm:col-span-2">
                                    <textarea 
                                        name="metaDescription" 
                                        value={editableProduct.marketing?.seo ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditableProduct({
                                                ...editableProduct,
                                                marketing: { ...editableProduct.marketing, seo: val }
                                            });
                                            setChangedFields(prev => new Set(prev).add('marketing.seo'));
                                            debouncedAutosave();
                                        }}
                                        onBlur={handleBlur}
                                        maxLength={155}
                                        rows={3}
                                        placeholder="Brief description for search results (≤155 chars)"
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {(editableProduct.marketing?.seo ?? '').length}/155 characters
                                    </p>
                                </FormField>
                                <FormField label="Media Status" className="sm:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            editableProduct.media?.hideImageDate 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {editableProduct.media?.hideImageDate ? '● Images Ready' : '○ Pending'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {editableProduct.media?.hideImageDate 
                                                ? `Set for ${new Date(editableProduct.media.hideImageDate).toLocaleDateString()}` 
                                                : 'Set "Hide Image Date" to mark as ready'}
                                        </span>
                                    </div>
                                </FormField>
                                <FormField label="Shipping Overrides">
                                    <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                                        <div className="flex items-center">
                                            <input 
                                                id="shipping.standardOverride" 
                                                name="shipping.standardOverride" 
                                                type="checkbox" 
                                                checked={editableProduct.shipping?.standardOverride ?? false} 
                                                onChange={(e) => {
                                                    setEditableProduct({
                                                        ...editableProduct,
                                                        shipping: { ...editableProduct.shipping, standardOverride: e.target.checked }
                                                    });
                                                    setChangedFields(prev => new Set(prev).add('shipping.standardOverride'));
                                                    debouncedAutosave();
                                                }}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded" 
                                            />
                                            <label htmlFor="shipping.standardOverride" className="ml-2 block text-sm text-gray-900">Standard Override</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input 
                                                id="shipping.expeditedOverride" 
                                                name="shipping.expeditedOverride" 
                                                type="checkbox" 
                                                checked={editableProduct.shipping?.expeditedOverride ?? false} 
                                                onChange={(e) => {
                                                    setEditableProduct({
                                                        ...editableProduct,
                                                        shipping: { ...editableProduct.shipping, expeditedOverride: e.target.checked }
                                                    });
                                                    setChangedFields(prev => new Set(prev).add('shipping.expeditedOverride'));
                                                    debouncedAutosave();
                                                }}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded" 
                                            />
                                            <label htmlFor="shipping.expeditedOverride" className="ml-2 block text-sm text-gray-900">Expedited Override</label>
                                        </div>
                                    </div>
                                </FormField>
                                <FormField label="Internal Notes" className="sm:col-span-2">
                                    <textarea 
                                        name="notes" 
                                        value={editableProduct.notes ?? ''} 
                                        onChange={handleInputChange}
                                        onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }}
                                        onBlur={handleBlur}
                                        rows={3}
                                        placeholder="Internal notes or observations..."
                                        className="block w-full border-gray-300 rounded-md shadow-sm" 
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Related Colors - Only show when Style ID exists and has related products */}
                        {editableProduct.style?.id && relatedColors.length > 0 && (
                            <div className="pt-6 border-t border-gray-200">
                                <h3 className="text-md font-medium text-gray-900 mb-4">
                                    Related Colors ({relatedColors.length})
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {relatedColors.map((relatedProduct) => (
                                        <div
                                            key={relatedProduct.id}
                                            className="p-3 border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
                                            onClick={() => {
                                                // Navigate to this product (could open in new drawer or update current)
                                                onSaved?.(relatedProduct.id, {});
                                            }}
                                        >
                                            <div className="flex gap-3">
                                                {facts.images?.[0] && (
                                                    <img 
                                                        src={facts.images[0]} 
                                                        alt={relatedProduct.name}
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {relatedProduct.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {relatedProduct.brand}
                                                    </p>
                                                    <div className="flex gap-2 mt-1">
                                                        {relatedProduct.primaryColor && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                {relatedProduct.primaryColor}
                                                            </span>
                                                        )}
                                                        {relatedProduct.status && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                relatedProduct.status === 'validated' ? 'bg-green-100 text-green-800' :
                                                                relatedProduct.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {relatedProduct.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'context' && (
                    <div className="space-y-6">
                        <FormField label="Keywords (one per line)"><textarea name="keywords" value={(editableProduct.aiContext.keywords ?? []).join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Feature Bullets (one per line)"><textarea name="featureBullets" value={(editableProduct.aiContext.featureBullets ?? []).join('\n')} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                        <FormField label="Design Notes"><textarea name="designNotes" value={editableProduct.aiContext.designNotes ?? ''} onChange={(e) => handleNestedChange(e, 'aiContext')} onFocus={(e) => { lastActiveField.current = { name: e.currentTarget.name }; }} onBlur={handleBlur} rows={6} className="block w-full border-gray-300 rounded-md shadow-sm" /></FormField>
                    </div>
                )}
                {activeTab === 'generation' && (
                    <div className="space-y-6">
                        {/* Read-only Attribute Preview */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Attributes (read-only)</h3>
                            <p className="text-xs text-gray-500 mb-3">Edit these in the Core Information tab</p>
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
                                <div><strong>Status:</strong> {editableProduct.status || '—'}</div>
                                <div><strong>Websites:</strong> {editableProduct.websites.join(', ') || '—'}</div>
                            </div>
                        </div>

                        {/* Product Information (Facts) */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-base font-semibold text-gray-800">Product Information</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {factsSaving && <span>Saving...</span>}
                                    {!factsSaving && factsLastSaved && (
                                        <span>Saved · {Math.floor((Date.now() - factsLastSaved.getTime()) / 1000)}s ago</span>
                                    )}
                                </div>
                            </div>

                            {/* Brand Cheat Sheet */}
                            {brandCheatSheet && (
                                <div className="mb-4 border border-indigo-200 rounded-lg bg-indigo-50">
                                    <button
                                        type="button"
                                        onClick={() => setCheatSheetExpanded(!cheatSheetExpanded)}
                                        className="w-full px-3 py-2 flex justify-between items-center text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                        <span>💡 {product?.brand} Brand Cheat Sheet</span>
                                        <span>{cheatSheetExpanded ? '▼' : '▶'}</span>
                                    </button>
                                    {cheatSheetExpanded && (
                                        <div className="px-3 pb-3 space-y-2">
                                            {Object.entries(brandCheatSheet).map(([key, value]) => (
                                                <div key={key} className="flex justify-between items-start gap-2 text-xs">
                                                    <div className="flex-1">
                                                        <strong className="text-gray-700">{key}:</strong>
                                                        <p className="text-gray-600">{String(value)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyFromCheatSheet(key as keyof ProductFacts, String(value))}
                                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Observations</label>
                                    <textarea
                                        value={facts.observations}
                                        onChange={(e) => handleFactsChange('observations', e.target.value)}
                                        rows={3}
                                        placeholder="What stands out about this product?"
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Materials</label>
                                        <textarea
                                            value={facts.materials}
                                            onChange={(e) => handleFactsChange('materials', e.target.value)}
                                            rows={2}
                                            placeholder="e.g., 100% cotton, polyester blend"
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Fit</label>
                                        <textarea
                                            value={facts.fit}
                                            onChange={(e) => handleFactsChange('fit', e.target.value)}
                                            rows={2}
                                            placeholder="e.g., Regular, Slim, Oversized"
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Use Cases</label>
                                    <textarea
                                        value={facts.useCases}
                                        onChange={(e) => handleFactsChange('useCases', e.target.value)}
                                        rows={2}
                                        placeholder="e.g., Athletic, Casual, Work"
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Care Instructions</label>
                                        <textarea
                                            value={facts.care}
                                            onChange={(e) => handleFactsChange('care', e.target.value)}
                                            rows={2}
                                            placeholder="e.g., Machine wash cold"
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Team/League</label>
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
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Keywords</label>
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

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Images</label>
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

                        {/* Inline Generation Controls */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">Generate Product Copy</h3>
                                    <p className="text-sm text-gray-500 mt-1">Create a RetailOps description for this product</p>
                                    <p className="text-xs text-gray-400 mt-2">Uses Attributes + Product Information + Images</p>
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

                         {aiScore && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="text-md font-semibold text-gray-800">AI Quality Score</h3>
                                <div className="flex items-baseline mt-2">
                                    <p className="text-4xl font-bold text-indigo-600">{aiScore.overall}</p>
                                    <p className="text-xl text-gray-500">/10</p>
                                </div>
                            </div>
                        )}

                        {/* AI Descriptions from subcollection */}
                        {Object.keys(aiDescriptions).length > 0 && (
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Saved Product Copy</h4>
                                <p className="text-xs text-gray-500 mb-3">Saved drafts live here. Generate again to create another version.</p>
                                <div className="max-h-96 overflow-y-auto">
                                    {(Object.entries(aiDescriptions) as [string, AIDescription][]).map(([channel, data]) => (
                                        <div key={channel} className="mb-4 last:mb-0">
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
                                                        // Apply to paragraphDraft field
                                                        if (editableProduct) {
                                                            setEditableProduct({
                                                                ...editableProduct,
                                                                marketing: {
                                                                    ...editableProduct.marketing,
                                                                    paragraphDraft: data.text,
                                                                },
                                                            });
                                                            setChangedFields(prev => new Set(prev).add('marketing.paragraphDraft'));
                                                            setToastMessage({ text: 'Applied to Product Info', type: 'success' });
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

                        <FormField label="Generated Title"><div className="p-2 bg-gray-100 rounded-md min-h-[40px]">{editableProduct.marketing.title}</div></FormField>
                        <FormField label="Generated Bullets"><ul className="p-2 pl-6 bg-gray-100 rounded-md min-h-[80px] list-disc space-y-1">{editableProduct.marketing.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul></FormField>
                        <FormField label="Generated SEO Description"><div className="p-2 bg-gray-100 rounded-md min-h-[60px]">{editableProduct.marketing.seo}</div></FormField>
                        <FormField label="Marketing Description"><div className="p-2 bg-gray-100 rounded-md min-h-[120px] whitespace-pre-wrap">{editableProduct.marketing.paragraphDraft}</div></FormField>
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
                      Saved · {lastSavedAt ? Math.max(0, Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)) : 0}s ago
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {/* Missing fields warning */}
                  {!canApprove() && getMissingFields().length > 0 && (
                    <div className="text-xs text-red-600">
                      Missing: {getMissingFields().join(', ')}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save (Draft)</button>
                    <button 
                      type="button" 
                      onClick={handleApprove}
                      disabled={!canApprove()}
                      className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      title={!canApprove() ? `Missing: ${getMissingFields().join(', ')}` : 'Publish (validate and mark ready)'}
                    >
                      Publish
                    </button>
                  </div>
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

// Prevent unnecessary remounts
export default React.memo(ProductEditorDrawer, (prev, next) => 
  prev.product?.id === next.product?.id && prev.isOpen === next.isOpen
);