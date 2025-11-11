import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface VocabOption {
  value: string;
  label: string;
}

export interface VocabData {
  departments: VocabOption[];
  classes: VocabOption[];
  categories: VocabOption[];
  ageGroups: VocabOption[];
  genders: VocabOption[];
  materials: VocabOption[];
  primaryColors: VocabOption[];
  descriptiveColors: VocabOption[];
  cutTypes: VocabOption[];
  closureTypes: VocabOption[];
  heelHeights: VocabOption[];
  platformHeights: VocabOption[];
  fits: VocabOption[];
  statuses: VocabOption[];
  websites: VocabOption[];
  sportsTeams: VocabOption[];
  leagues: VocabOption[];
  loading: boolean;
}

/**
 * Hook to subscribe to vocabulary collections from Firestore Settings.
 * Returns live vocab options for dropdowns.
 */
export function useVocab(): VocabData {
  const [vocab, setVocab] = useState<VocabData>({
    departments: [],
    classes: [],
    categories: [],
    ageGroups: [],
    genders: [],
    materials: [],
    primaryColors: [],
    descriptiveColors: [],
    cutTypes: [],
    closureTypes: [],
    heelHeights: [],
    platformHeights: [],
    fits: [],
    statuses: [],
    websites: [],
    sportsTeams: [],
    leagues: [],
    loading: true,
  });

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Helper to subscribe to a collection and map docs to options
    const subscribe = (collectionName: string, fieldName: keyof VocabData) => {
      const colRef = collection(db, 'settings', collectionName, 'items');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const options: VocabOption[] = snapshot.docs.map((doc) => ({
            value: doc.data().value || doc.id,
            label: doc.data().label || doc.data().value || doc.id,
          }));
          setVocab((prev) => ({ ...prev, [fieldName]: options }));
        },
        (error) => {
          console.error(`[useVocab] Failed to load ${collectionName}:`, error);
          // On error, keep empty array
        }
      );
      unsubscribers.push(unsubscribe);
    };

    // Subscribe to all vocab collections
    subscribe('departments', 'departments');
    subscribe('classes', 'classes');
    subscribe('categories', 'categories');
    subscribe('ageGroups', 'ageGroups');
    subscribe('genders', 'genders');
    subscribe('materials', 'materials');
    subscribe('primaryColors', 'primaryColors');
    subscribe('descriptiveColors', 'descriptiveColors');
    subscribe('cutTypes', 'cutTypes');
    subscribe('closureTypes', 'closureTypes');
    subscribe('heelHeights', 'heelHeights');
    subscribe('platformHeights', 'platformHeights');
    subscribe('fits', 'fits');
    subscribe('statuses', 'statuses');
    subscribe('websites', 'websites');
    subscribe('sportsTeams', 'sportsTeams');
    subscribe('leagues', 'leagues');

    // Mark loading as false after initial setup
    setTimeout(() => {
      setVocab((prev) => ({ ...prev, loading: false }));
    }, 500);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return vocab;
}
