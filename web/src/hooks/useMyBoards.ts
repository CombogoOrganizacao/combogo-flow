import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { Board } from "@/types";

/** Lista, em tempo real, os boards em que o usuário logado é membro. */
export function useMyBoards() {
  const user = useAuthStore((s) => s.user);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBoards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Board));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { boards, loading };
}
