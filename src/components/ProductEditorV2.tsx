import React, { useState, useEffect, useRef, useCallback, ChangeEvent, useMemo } from 'react';
import { Product, ProductFacts } from '../types';
import { describeProduct, DescribeProductPayload } from '../services/describe';
import type { AIScores, AICoach, AISEO, DescribeProductResponse } from '../services/describe';
import { analyzeImage } from '../services/vision';
import { useVocab, VocabData } from '../hooks/useVocab';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Toast from './Toast';
import Select from './ui/Select';
import { sanitizeFirestoreData } from '../utils/firestoreSafe.ts';

interface ProductEditorV2Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved?: (productId: string, updates: Partial<Product>) => void;
}

type ActiveTab = 'attributes' | 'facts' | 'ai';

type AIDescription = {
  text: string;
  scores?: { overall?: number; factual?: number; tone?: number; seo?: number; clarity?: number };
  coach?: { reasons?: string[]; actions?: string[]; next_questions?: string[] };
  seo?: { meta_title?: string; meta_description?: string; meta_keywords?: string[] };
  facts_used?: string[];
  meta?: {
    tone?: string;
    length?: string;
    temperature?: number;
    generatedAt?: any;
    updatedAt?: any;
    title?: string;
    description?: string;
    keywords?: string[];
  };
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

/**
 * Build vocabulary normalization map from live vocab data
 * Maps all vocab values to their canonical labels for AI consistency
 */
function buildVocabMap(vocab: VocabData): Record<string, string> {
  const map: Record<string, string> = {};
  
  // Helper to add vocab options to map
  const addOptions = (options: Array<{ value: string; label: string }>) => {
    options.forEach(opt => {
      if (opt.value !== opt.label) {
        map[opt.value] = opt.label;
      }
    });
  };
  
  // Add all vocabulary collections
  addOptions(vocab.genders);
  addOptions(vocab.ageGroups);
  addOptions(vocab.fits);
  addOptions(vocab.materials);
  addOptions(vocab.primaryColors);
  addOptions(vocab.descriptiveColors);
  addOptions(vocab.cutTypes);
  addOptions(vocab.closureTypes);
  addOptions(vocab.heelHeights);
  addOptions(vocab.platformHeights);
  addOptions(vocab.sportsTeams);
  addOptions(vocab.leagues);
  addOptions(vocab.categories);
  addOptions(vocab.departments);
  addOptions(vocab.classes);
  
  return map;
}

const ProductEditorV2: React.FC<ProductEditorV2Props> = ({ isOpen, onClose, product, onSaved }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('attributes');
  const [editableProduct, setEditableProduct] = useState<Product | null>(product);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Live vocabulary & auth
  const vocab = useVocab();
  const { user } = useAuth();
  
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
  const [aiTemperature, setAiTemperature] = useState(0.6);
  const [generatingInline, setGeneratingInline] = useState(false);
  const [aiScores, setAiScores] = useState<AIScores | null>(null);
  const [aiCoach, setAiCoach] = useState<AICoach | null>(null);
  const [aiSEO, setAiSEO] = useState<AISEO | null>(null);
  const [usedTemplate, setUsedTemplate] = useState<{ scope: string; key: string; version: string; conditionsMatched?: string[] } | null>(null);
  const [templateOverride, setTemplateOverride] = useState<string | null>(null);
  const [improvementText, setImprovementText] = useState('');
  const [qaOpen, setQaOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState('');
  const [seoEdit, setSeoEdit] = useState<{ title: string; description: string; keywords: string[] }>({ title: '', description: '', keywords: [] });

  useEffect(() => {
    if (aiSEO) {
      setSeoEdit({
        title: aiSEO.meta_title || '',
        description: aiSEO.meta_description || '',
        keywords: Array.isArray(aiSEO.meta_keywords) ? aiSEO.meta_keywords : [],
      });
    }
  }, [aiSEO]);
  
  // Build vocab normalization map from live vocab data
  const vocabMap = useMemo(() => buildVocabMap(vocab), [vocab]);
  
  // Vocab rules (banned words, synonyms)
  const [vocabRules, setVocabRules] = useState<{ banned?: string[]; synonyms?: Record<string, string> } | null>(null);

  // Load vocab rules once
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'vocab'));
        setVocabRules(snap.exists() ? (snap.data() as any) : {});
      } catch (e) {
        console.warn('[editorV2] vocab rules missing', e);
        setVocabRules({});
      }
    })();
  }, []);

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
        // Initialize SEO edit fields from saved meta (RetailOps doc) if present
        const retailOps = descriptions['RetailOps'];
        if (retailOps?.meta) {
          setSeoEdit({
            title: retailOps.meta.title || '',
            description: retailOps.meta.description || '',
            keywords: Array.isArray(retailOps.meta.keywords) ? retailOps.meta.keywords : [],
          });
        }
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
        updatedBy: user?.email || user?.uid || 'anonymous',
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
      const storagePath = `products/${product.id}/images/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Call vision API to analyze the image
      let aiObservations: string[] = [];
      try {
        aiObservations = await analyzeImage(downloadURL);
        console.log('[ProductEditorV2] AI observations:', aiObservations);
      } catch (visionErr) {
        console.warn('[ProductEditorV2] Vision API failed, continuing without observations:', visionErr);
      }

      // Append AI observations to existing observations
      let updatedObservations = facts.observations;
      if (aiObservations.length > 0) {
        const newObservations = aiObservations.map(obs => `• ${obs}`).join('\n');
        updatedObservations = facts.observations 
          ? `${facts.observations}\n${newObservations}`
          : newObservations;
      }

      const updated = { 
        ...facts, 
        images: [...facts.images, { url: downloadURL, storagePath }],
        observations: updatedObservations
      };
      setFacts(updated);
      await saveFacts(updated);
      
      const message = aiObservations.length > 0 
        ? `Image uploaded with ${aiObservations.length} AI observations`
        : 'Image uploaded';
      setToastMessage({ text: message, type: 'success' });
    } catch (error) {
      console.error('[editorV2] Image upload failed:', error);
      setToastMessage({ text: 'Failed to upload image', type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove image
  const handleRemoveImage = async (index: number) => {
    if (!product?.id) return;

    try {
      const imageToRemove = facts.images[index];
      const imageRef = ref(storage, imageToRemove.storagePath);
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
  const computeOverall = (scores?: AIScores | null) => {
    if (!scores) return undefined;
    if (typeof scores.overall === 'number') return scores.overall;
    const factual = scores.factual ?? 0;
    const tone = scores.tone ?? 0;
    const seo = scores.seo ?? 0;
    const clarity = scores.clarity ?? 0;
    return Math.round(0.4 * factual + 0.3 * tone + 0.2 * seo + 0.1 * clarity);
  };

  const handleInlineGenerate = async () => {
    if (!editableProduct?.id) {
      setToastMessage({ text: 'Product ID required', type: 'error' });
      return;
    }

    try {
      setGeneratingInline(true);
      setAiScores(null);
      setAiCoach(null);
      setAiSEO(null);
      setUsedTemplate(null);
      
      const channel = 'RetailOps';
      
      const payload: DescribeProductPayload = {
        productId: editableProduct.id,
        channel,
        tone: aiTone,
        length: aiLength,
        temperature: aiTemperature,
        facts: {
          observations: facts.observations,
          materials: facts.materials,
          fit: facts.fit,
          keywords: facts.keywords,
        },
        aiContext: {
          keywords: editableProduct.aiContext?.keywords || [],
          featureBullets: editableProduct.aiContext?.featureBullets || [],
          designNotes: editableProduct.aiContext?.designNotes || '',
          priorDraft: editableProduct.marketing.paragraphDraft || undefined,
        },
        attributes: {
          name: editableProduct.name,
          brand: editableProduct.brand,
          mpn: editableProduct.mpn,
          department: editableProduct.department,
          class: editableProduct.class,
          category: editableProduct.category,
          ageGroup: editableProduct.ageGroup,
          gender: editableProduct.gender,
          material: editableProduct.materialFabric,
          materials: editableProduct.materials || [],
          fit: editableProduct.fit,
          sportsTeam: editableProduct.sportsTeam,
          league: editableProduct.league,
          primaryColor: (editableProduct as any).primaryColor ?? undefined,
          descriptiveColor: (editableProduct as any).descriptiveColor ?? undefined,
          cutType: (editableProduct as any).cutType ?? undefined,
          closureType: (editableProduct as any).closureType ?? undefined,
          heelHeight: (editableProduct as any).heelHeight ?? undefined,
          platformHeight: (editableProduct as any).platformHeight ?? undefined,
          status: editableProduct.status,
          websites: editableProduct.websites,
          price: (editableProduct as any).price ?? undefined,
        },
        imageUrl: facts.images[0]?.url,
      };
      
  const result = await describeProduct(payload, vocabMap);
  const description = result.description || result.text || '';
      
      if (!description) {
        setToastMessage({ text: 'No description returned from API', type: 'error' });
        return;
      }

      // Update AI scores if available
      const scores: AIScores | undefined = result.scores || (result.seo_score || result.tone_score ? { seo: result.seo_score, tone: result.tone_score } : undefined);
      if (scores) {
        const overall = computeOverall(scores);
        setAiScores({ ...scores, overall });
      }
      setAiCoach(result.coach || null);
      setAiSEO(result.seo || null);
      setUsedTemplate((result as any).used_template || null);

      // Write to Firestore subcollection
      const descRef = doc(db, 'products', editableProduct.id, 'descriptions', channel);
      // Maintain short history (last 3 generations)
      const descRefInline = doc(db, 'products', editableProduct.id, 'descriptions', channel);
      let existing: any = null;
      try {
        const snap = await getDoc(descRefInline);
        if (snap.exists()) existing = snap.data();
      } catch {}

      // Build history entry with client timestamp (arrays cannot contain serverTimestamp)
      const newEntry = {
        text: description,
        scores: result.scores || null,
        coach: result.coach || null,
        seo: result.seo || null,
        facts_used: result.facts_used || [],
        at: Date.now(),
      };

      const prevHistoryRaw = Array.isArray(existing?.history) ? existing.history : [];
      const prevHistory = prevHistoryRaw
        .map((entry: any) => ({ ...entry, at: typeof entry?.at === 'object' ? Date.now() : entry?.at }))
        .slice(-2);

      await setDoc(
        descRefInline,
        {
          text: description,
          scores: result.scores || undefined,
          coach: result.coach || undefined,
          seo: result.seo || undefined,
          facts_used: result.facts_used || [],
          meta: {
            tone: aiTone,
            length: aiLength,
            temperature: aiTemperature,
            generatedAt: serverTimestamp(),
            title: result.seo?.meta_title,
            description: result.seo?.meta_description,
            keywords: result.seo?.meta_keywords,
          },
          history: [...prevHistory, newEntry],
        },
        { merge: true }
      );

      // Auto-apply to paragraphDraft field
      setEditableProduct({
        ...editableProduct,
        marketing: {
          ...editableProduct.marketing,
          paragraphDraft: description,
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

    try {
      const payload = cleanForFirestore<any>({
        name: editableProduct.name,
        brand: editableProduct.brand,
        status: editableProduct.status,
        department: editableProduct.department,
        class: editableProduct.class,
        category: editableProduct.category,
        ageGroup: editableProduct.ageGroup,
        gender: editableProduct.gender,
        materialFabric: editableProduct.materialFabric,
        materials: editableProduct.materials || [],
        fit: editableProduct.fit,
        primaryColor: editableProduct.primaryColor,
        descriptiveColor: editableProduct.descriptiveColor,
        cutType: editableProduct.cutType,
        closureType: editableProduct.closureType,
        heelHeight: editableProduct.heelHeight,
        platformHeight: editableProduct.platformHeight,
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
    } catch (error) {
      console.error('[editorV2] Failed to save product:', error);
      setToastMessage({ text: 'Failed to save product', type: 'error' });
      setSavingState('idle');
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
    const overall = aiScores?.overall ?? (aiScores ? Math.round(0.4*(aiScores.factual??0)+0.3*(aiScores.tone??0)+0.2*(aiScores.seo??0)+0.1*(aiScores.clarity??0)) : 0);
    const scoreOk = overall >= 8; // approval gate
    return hasName && hasBrand && hasCategory && hasDescription && scoreOk;
  }, [editableProduct, aiDescriptions, aiScores]);

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
        requestedBy: user?.email || user?.uid || 'anonymous',
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
                    Verification
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
                    
                    {!vocab.loading && console.log('[vocab]', {
                      departments: vocab.departments,
                      classes: vocab.classes,
                      categories: vocab.categories,
                      materials: vocab.materials,
                      fits: vocab.fits,
                    })}
                    
                    <div className="grid grid-cols-1 gap-y-4 sm:gap-y-6 sm:gap-x-4 sm:grid-cols-2">
                      {/* Name & MPN */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Name</label>
                        <input 
                          type="text" 
                          value={editableProduct.name ?? ''} 
                          onChange={(e) =>
                            setEditableProduct((p) => p ? ({ ...p, name: e.target.value }) : null)
                          }
                          className="block w-full text-sm sm:text-base border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2.5" 
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

                      {/* Materials (multi-select chips) */}
                      <div className="md:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Materials</label>
                        <div className="border border-gray-300 rounded-md p-2 bg-white min-h-[42px]">
                          {/* Selected materials as removable chips */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(editableProduct.materials || []).map((mat, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                                {mat}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(editableProduct.materials || [])];
                                    updated.splice(idx, 1);
                                    setEditableProduct(p => p ? { ...p, materials: updated } : null);
                                  }}
                                  className="ml-1.5 inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800 focus:outline-none"
                                  aria-label={`Remove ${mat}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          {/* Dropdown to add materials */}
                          <select
                            className="w-full border-0 focus:ring-0 text-sm text-gray-700 bg-transparent"
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !(editableProduct.materials || []).includes(val)) {
                                setEditableProduct(p => p ? {
                                  ...p,
                                  materials: [...(p.materials || []), val]
                                } : null);
                              }
                            }}
                            disabled={vocab.loading}
                          >
                            <option value="">Add material...</option>
                            {vocab.materials
                              .filter(m => !(editableProduct.materials || []).includes(m.value))
                              .map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Select multiple materials from the dropdown</p>
                      </div>

                      {/* Keep old materialFabric for backward compatibility (hidden) */}
                      <input type="hidden" name="materialFabric" value={editableProduct.materialFabric ?? ''} />

                      {/* Primary Color */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
                        <Select
                          name="primaryColor"
                          value={(editableProduct as any).primaryColor ?? ''}
                          onChange={(val) => handleSelectChange('primaryColor', val)}
                          options={['', ...((vocab as any).primaryColors ?? []).map((v: any) => v.value)]}
                          placeholder="Select primary color..."
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Descriptive Color (free-text) */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Descriptive Color</label>
                        <input
                          type="text"
                          name="descriptiveColor"
                          value={(editableProduct as any).descriptiveColor ?? ''}
                          onChange={(e) => setEditableProduct(p => p ? { ...p, descriptiveColor: e.target.value } : null)}
                          placeholder="e.g., 'Sail/University Red', 'Rose Gold', 'Icy Mint'"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Manufacturer's descriptive color text</p>
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

                      {/* Cut Type */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Cut Type</label>
                        <Select
                          name="cutType"
                          value={(editableProduct as any).cutType ?? ''}
                          onChange={(val) => handleSelectChange('cutType', val)}
                          options={['', ...((vocab as any).cutTypes ?? []).map((v: any) => v.value)]}
                          placeholder="Select cut type..."
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Closure Type */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Closure Type</label>
                        <Select
                          name="closureType"
                          value={(editableProduct as any).closureType ?? ''}
                          onChange={(val) => handleSelectChange('closureType', val)}
                          options={['', ...((vocab as any).closureTypes ?? []).map((v: any) => v.value)]}
                          placeholder="Select closure type..."
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
                      {/* Heel Height */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Heel Height</label>
                        <Select
                          name="heelHeight"
                          value={(editableProduct as any).heelHeight ?? ''}
                          onChange={(val) => handleSelectChange('heelHeight', val)}
                          options={['', ...((vocab as any).heelHeights ?? []).map((v: any) => v.value)]}
                          placeholder="Select heel height..."
                          disabled={vocab.loading}
                        />
                      </div>

                      {/* Platform Height */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Platform Height</label>
                        <Select
                          name="platformHeight"
                          value={(editableProduct as any).platformHeight ?? ''}
                          onChange={(val) => handleSelectChange('platformHeight', val)}
                          options={['', ...((vocab as any).platformHeights ?? []).map((v: any) => v.value)]}
                          placeholder="Select platform height..."
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
                          {facts.images.map((image, i) => (
                            <div key={i} className="relative group">
                              <img src={image.url} alt={`Product ${i + 1}`} className="w-full h-20 object-cover rounded border border-gray-200" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(i)}
                                className="absolute top-0 right-0 p-1 bg-red-600 text-white text-xs rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sticky Footer CTA */}
                    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleInlineGenerate();
                          setActiveTab('ai');
                        }}
                        disabled={generatingInline || !editableProduct}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingInline ? 'Generating...' : 'Generate → Verify'}
                      </button>
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

                    {/* AI Quality Scores */}
                    {aiScores && (
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-semibold text-gray-800">AI Quality Score</h3>
                          {usedTemplate && (
                            <span className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-100 rounded">
                              Audience: {usedTemplate.key} ({usedTemplate.version})
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
                          <div>
                            <p className="text-3xl font-bold text-indigo-600">{aiScores.overall ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-1">Overall</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-indigo-600">{aiScores.factual ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-1" title="Accuracy of facts, use of observations verbatim">Factual</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-indigo-600">{aiScores.tone ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-1" title="Matches requested tone and audience">Tone</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-indigo-600">{aiScores.seo ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-1" title="Meta readiness and keyword use">SEO</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-indigo-600">{aiScores.clarity ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-1" title="Clarity and readability for buyers">Clarity</p>
                          </div>
                        </div>
                        {aiCoach?.actions?.length ? (
                          <div className="mt-3">
                            <p className="text-xs text-gray-700 mb-1">To reach 10:</p>
                            <div className="flex flex-wrap gap-2">
                              {aiCoach.actions.map((action, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="px-2 py-1 text-xs bg-white border border-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-50"
                                  onClick={async () => {
                                    setImprovementText(action);
                                    await handleInlineGenerate();
                                  }}
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {aiCoach?.next_questions?.length ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setQaOpen(v => !v)}
                              className="text-xs text-indigo-700 underline"
                            >
                              {qaOpen ? 'Hide' : 'Show'} Q&A Coach
                            </button>
                            {qaOpen && (
                              <div className="mt-2 space-y-2">
                                {aiCoach.next_questions.map((q, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50"
                                      onClick={() => { setPendingQuestion(q); setPendingAnswer(''); }}
                                    >
                                      {q}
                                    </button>
                                  </div>
                                ))}
                                {pendingQuestion && (
                                  <div className="mt-2 p-2 bg-white border border-gray-200 rounded">
                                    <p className="text-xs text-gray-700 mb-1">{pendingQuestion}</p>
                                    <input
                                      type="text"
                                      value={pendingAnswer}
                                      onChange={(e) => setPendingAnswer(e.target.value)}
                                      placeholder="Yes/No or brief answer"
                                      className="w-full text-xs border-gray-300 rounded"
                                    />
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        type="button"
                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                                        onClick={async () => {
                                          const addition = `${pendingQuestion} ${pendingAnswer ? '- ' + pendingAnswer : ''}`.trim();
                                          setImprovementText(prev => prev ? `${prev}; ${addition}` : addition);
                                          setPendingQuestion(null);
                                          setPendingAnswer('');
                                          await handleInlineGenerate();
                                        }}
                                      >
                                        Answer & Regenerate
                                      </button>
                                      <button type="button" className="px-2 py-1 text-xs border rounded" onClick={() => { setPendingQuestion(null); setPendingAnswer(''); }}>Cancel</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* SEO Diagnostics */}
                    {aiSEO && (aiSEO.meta_title || aiSEO.meta_description || (aiSEO.meta_keywords && aiSEO.meta_keywords.length > 0)) && (
                      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-semibold text-gray-800">SEO Metadata</h3>
                          <button
                            type="button"
                            onClick={() => setSeoOpen(v => !v)}
                            className="text-xs text-green-700 underline"
                          >
                            {seoOpen ? 'Hide' : 'Show'} Details
                          </button>
                        </div>
                        {seoOpen && (
                          <div className="space-y-2">
                            {aiSEO.meta_title && (
                              <div className="p-2 bg-white rounded border border-green-200">
                                <p className="text-xs font-medium text-gray-700">Meta Title ({aiSEO.meta_title.length} chars)</p>
                                <p className="text-sm text-gray-900 mt-1">{aiSEO.meta_title}</p>
                              </div>
                            )}
                            {aiSEO.meta_description && (
                              <div className="p-2 bg-white rounded border border-green-200">
                                <p className="text-xs font-medium text-gray-700">Meta Description ({aiSEO.meta_description.length} chars)</p>
                                <p className="text-sm text-gray-900 mt-1">{aiSEO.meta_description}</p>
                              </div>
                            )}
                            {aiSEO.meta_keywords && aiSEO.meta_keywords.length > 0 && (
                              <div className="p-2 bg-white rounded border border-green-200">
                                <p className="text-xs font-medium text-gray-700 mb-1">Meta Keywords</p>
                                <div className="flex flex-wrap gap-1">
                                  {aiSEO.meta_keywords.map((kw, i) => (
                                    <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Section */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h3 className="text-base font-semibold text-gray-800 mb-2">Improve this</h3>
                      <p className="text-xs text-gray-500 mb-3">Tell the AI what to fix or enhance</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['Fit','Cushioning','Care','Sizing','Use-case'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                            onClick={() => setImprovementText(prev => prev ? `${prev}; Add ${chip.toLowerCase()} details` : `Add ${chip.toLowerCase()} details`)}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      
                      <textarea
                        value={improvementText}
                        onChange={(e) => setImprovementText(e.target.value)}
                        rows={3}
                        placeholder="e.g., Make it more technical, add bullet points, emphasize durability..."
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-3"
                      />
                      
                      {/* Template Override */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Template Override
                          <span className="ml-1 text-gray-500 font-normal">(optional, for this generation only)</span>
                        </label>
                        <select
                          value={templateOverride || ''}
                          onChange={(e) => setTemplateOverride(e.target.value || null)}
                          disabled={generatingInline}
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                        >
                          <option value="">Auto-select (based on attributes)</option>
                          <option value="default">Default</option>
                          <option value="mens_footwear">Men's Footwear</option>
                          <option value="womens_footwear">Women's Footwear</option>
                          <option value="kids_gs">Kids (Grade School)</option>
                          <option value="toddler">Toddler</option>
                          <option value="apparel_mens">Apparel (Men's)</option>
                          <option value="apparel_womens">Apparel (Women's)</option>
                          <option value="accessories">Accessories</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
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
                      
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Creativity (Temperature: {aiTemperature.toFixed(1)})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={aiTemperature}
                          onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                          disabled={generatingInline}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Consistent</span>
                          <span>Balanced</span>
                          <span>Creative</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editableProduct?.id) return;
                          setGeneratingInline(true);
                          setAiScores(null);
                          setAiCoach(null);
                          setAiSEO(null);
                          try {
                            const payload: DescribeProductPayload = {
                              productId: editableProduct.id,
                              channel: 'RetailOps',
                              tone: aiTone,
                              length: aiLength,
                              templateOverride: templateOverride || undefined,
                              temperature: aiTemperature,
                              facts: {
                                observations: facts.observations,
                                materials: facts.materials,
                                fit: facts.fit,
                                keywords: facts.keywords,
                              },
                              aiContext: {
                                keywords: facts.keywords,
                                featureBullets: editableProduct.aiContext?.featureBullets || [],
                                designNotes: improvementText || undefined,
                                priorDraft: editableProduct.marketing.paragraphDraft || undefined,
                              },
                              attributes: {
                                name: editableProduct.name,
                                brand: editableProduct.brand,
                                mpn: editableProduct.mpn,
                                department: editableProduct.department,
                                class: editableProduct.class,
                                category: editableProduct.category,
                                ageGroup: editableProduct.ageGroup,
                                gender: editableProduct.gender,
                                material: editableProduct.materialFabric,
                                materials: editableProduct.materials || [],
                                fit: editableProduct.fit,
                                sportsTeam: editableProduct.sportsTeam,
                                league: editableProduct.league,
                                primaryColor: (editableProduct as any).primaryColor ?? undefined,
                                descriptiveColor: (editableProduct as any).descriptiveColor ?? undefined,
                                cutType: (editableProduct as any).cutType ?? undefined,
                                closureType: (editableProduct as any).closureType ?? undefined,
                                heelHeight: (editableProduct as any).heelHeight ?? undefined,
                                platformHeight: (editableProduct as any).platformHeight ?? undefined,
                                status: editableProduct.status,
                                websites: editableProduct.websites,
                                price: (editableProduct as any).price ?? undefined,
                              },
                              imageUrl: facts.images[0]?.url,
                            };
                            
                            const result = await describeProduct(payload, vocabMap);
                            
                            const description = result.description || result.text || '';
                            
                            if (description) {
                              // Save extended fields + history
                              const descRef2 = doc(db, 'products', editableProduct.id, 'descriptions', 'RetailOps');
                              let existing2: any = null;
                              try {
                                const snap2 = await getDoc(descRef2);
                                if (snap2.exists()) existing2 = snap2.data();
                              } catch {}
                              const history2raw = Array.isArray(existing2?.history) ? existing2.history : [];
                              const history2 = history2raw
                                .map((entry: any) => ({ ...entry, at: typeof entry?.at === 'object' ? Date.now() : entry?.at }))
                                .slice(-2);
                              const entry2 = {
                                text: description,
                                scores: result.scores || null,
                                coach: result.coach || null,
                                seo: result.seo || null,
                                facts_used: result.facts_used || [],
                                at: Date.now(),
                              };
                              const writePayload2 = {
                                text: description,
                                scores: result.scores || undefined,
                                coach: result.coach || undefined,
                                seo: result.seo || undefined,
                                facts_used: result.facts_used || [],
                                meta: { 
                                  tone: aiTone, 
                                  length: aiLength, 
                                  temperature: aiTemperature,
                                  generatedAt: serverTimestamp(),
                                  title: result.seo?.meta_title,
                                  description: result.seo?.meta_description,
                                  keywords: result.seo?.meta_keywords,
                                },
                                history: [...history2, entry2],
                              } as const;
                              await setDoc(descRef2, sanitizeFirestoreData(writePayload2), { merge: true });
                              
                              // Update local state
                              setAiDescriptions(prev => ({
                                ...prev,
                                RetailOps: { text: description, meta: { tone: aiTone, length: aiLength } },
                              }));
                              
                              // Set scores / coach / seo from API response (extended schema)
                              const newScores: AIScores | undefined = result.scores || (result.seo_score || result.tone_score ? { seo: result.seo_score, tone: result.tone_score } : undefined);
                              if (newScores) {
                                const overall = computeOverall(newScores);
                                setAiScores({ ...newScores, overall });
                              }
                              setAiCoach(result.coach || null);
                              setAiSEO(result.seo || null);
                              
                              // Capture which template was used (for visibility)
                              setUsedTemplate((result as any).used_template || null);
                              setToastMessage({ text: 'Generated successfully', type: 'success' });
                              setImprovementText(''); // Clear after generation
                            }
                          } catch (err: any) {
                            console.error('[ProductEditorV2] Generate failed:', err);
                            setToastMessage({ text: err?.message || 'Failed to generate', type: 'error' });
                          } finally {
                            setGeneratingInline(false);
                          }
                        }}
                        disabled={generatingInline || !editableProduct?.id}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                      >
                        {generatingInline ? 'Generating...' : '✨ Generate with AI'}
                      </button>
                      {/* Quick used_template panel (dev helper) */}
                      {usedTemplate && (
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                          <div className="text-xs text-gray-700">
                            <span className="font-medium">Template used:</span> {usedTemplate.key}
                            <span className="ml-2 text-gray-500">v{usedTemplate.version}</span>
                          </div>
                          {Array.isArray(usedTemplate.conditionsMatched) && usedTemplate.conditionsMatched.length > 0 && (
                            <div className="mt-1 text-[11px] text-gray-500">
                              Conditions: {usedTemplate.conditionsMatched.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <a
                        href={`/ai/describe?productId=${editableProduct?.id || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-xs text-center text-indigo-600 hover:text-indigo-800 underline"
                      >
                        More options →
                      </a>
                    </div>

                    {/* Current Draft */}
                    {editableProduct.marketing.paragraphDraft && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Draft</h4>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                          {editableProduct.marketing.paragraphDraft}
                        </div>
                        {/* SEO Preview */}
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <button
                            type="button"
                            className="text-sm font-medium text-indigo-700 underline"
                            onClick={() => setSeoOpen(v => !v)}
                          >
                            {seoOpen ? 'Hide' : 'Show'} SEO Preview
                          </button>
                          {seoOpen && (
                            <div className="mt-3 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Title ({seoEdit.title.length}/60)</label>
                                <input
                                  type="text"
                                  value={seoEdit.title}
                                  onChange={(e) => setSeoEdit(s => ({ ...s, title: e.target.value.slice(0,60) }))}
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Description ({seoEdit.description.length}/155)</label>
                                <textarea
                                  rows={2}
                                  value={seoEdit.description}
                                  onChange={(e) => setSeoEdit(s => ({ ...s, description: e.target.value.slice(0,155) }))}
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Keywords (5–8)</label>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                  {seoEdit.keywords.map((k, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                      {k}
                                      <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => setSeoEdit(s => ({ ...s, keywords: s.keywords.filter((_, idx) => idx !== i) }))}>×</button>
                                    </span>
                                  ))}
                                  {seoEdit.keywords.length < 8 && (
                                    <input
                                      type="text"
                                      placeholder="add keyword"
                                      className="text-xs border-gray-300 rounded px-2 py-1"
                                      onKeyDown={(e) => {
                                        const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                                        if (e.key === 'Enter' && val) {
                                          e.preventDefault();
                                          setSeoEdit(s => ({ ...s, keywords: [...s.keywords, val].slice(0,8) }));
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                  onClick={async () => {
                                    if (!editableProduct?.id) return;
                                    try {
                                      const refDoc = doc(db, 'products', editableProduct.id, 'descriptions', 'RetailOps');
                                      await setDoc(refDoc, {
                                        meta: {
                                          ...(aiDescriptions['RetailOps']?.meta || {}),
                                          title: seoEdit.title,
                                          description: seoEdit.description,
                                          keywords: seoEdit.keywords,
                                          updatedAt: serverTimestamp(),
                                        }
                                      }, { merge: true });
                                      setToastMessage({ text: 'SEO meta saved', type: 'success' });
                                    } catch (e) {
                                      setToastMessage({ text: 'Failed to save SEO meta', type: 'error' });
                                    }
                                  }}
                                >
                                  Save SEO
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Latest RetailOps Description */}
                    {aiDescriptions['RetailOps'] && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700">Latest RetailOps Draft</h4>
                            {aiDescriptions['RetailOps'].meta && (
                              <p className="text-xs text-gray-500 mt-1">
                                {aiDescriptions['RetailOps'].meta.tone} · {aiDescriptions['RetailOps'].meta.length}
                              </p>
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
                                    paragraphDraft: aiDescriptions['RetailOps'].text,
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
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                          <div dangerouslySetInnerHTML={{ __html: aiDescriptions['RetailOps'].text }} />
                        </div>
                      </div>
                    )}

                    {/* Other Saved Descriptions */}
                    {Object.keys(aiDescriptions).filter(ch => ch !== 'RetailOps').length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Other Saved Drafts</h4>
                        <div className="space-y-4">
                          {(Object.entries(aiDescriptions) as [string, AIDescription][])
                            .filter(([channel]) => channel !== 'RetailOps')
                            .map(([channel, data]) => (
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
                              <div className="p-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                                <div dangerouslySetInnerHTML={{ __html: data.text }} />
                              </div>
                            </div>
                          ))}
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
