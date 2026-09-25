import type { Firestore, Query as FirestoreQuery } from 'firebase-admin/firestore'
import { firebase } from '../firebase'
import { normalize } from './normalize'
import type { Doc, Query, Store, Write } from './types'

const toDoc = (snapshot: FirebaseFirestore.DocumentSnapshot): Doc => ({ id: snapshot.id, ...normalize(snapshot.data() ?? {}) })

function build(db: Firestore, collection: string, query: Query = {}) {
  let ref: FirestoreQuery = db.collection(collection)
  for (const [field, op, value] of query.where ?? []) ref = ref.where(field, op, value)
  if (query.orderBy) ref = ref.orderBy(query.orderBy[0], query.orderBy[1])
  if (query.limit) ref = ref.limit(query.limit)
  return ref
}

export function firestoreStore(): Store {
  const db = () => firebase().db
  return {
    async list(collection, query) {
      const snapshot = await build(db(), collection, query).get()
      return snapshot.docs.map(toDoc)
    },
    async get(collection, id) {
      if (!id) return null
      const snapshot = await db().collection(collection).doc(id).get()
      return snapshot.exists ? toDoc(snapshot) : null
    },
    async add(collection, data) {
      const ref = await db().collection(collection).add(data)
      return ref.id
    },
    async set(collection, id, data, merge = true) {
      await db().collection(collection).doc(id).set(data, { merge })
    },
    async update(collection, id, data) {
      await db().collection(collection).doc(id).update(data)
    },
    async commit(writes: Write[]) {
      const batch = db().batch()
      for (const write of writes) {
        const collection = db().collection(write.collection)
        if (write.type === 'add') batch.set(collection.doc(), write.data)
        else if (write.type === 'set') batch.set(collection.doc(write.id), write.data, { merge: write.merge ?? true })
        else batch.update(collection.doc(write.id), write.data as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>)
      }
      await batch.commit()
    },
    watch(collection, query, listener) {
      return build(db(), collection, query).onSnapshot(
        snapshot => listener(snapshot.docs.map(toDoc)),
        error => console.error(`watch ${collection} failed`, error.message)
      )
    }
  }
}
