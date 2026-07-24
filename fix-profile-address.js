const fs = require('fs');
let file = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

const importReplace = `import { AddressForm } from "@/lib/components/address/AddressForm";`;
file = file.replace(importReplace, `import { AddressSelector } from "@/lib/components/address/AddressSelector";`);

const stateReplace = `  const [name, setName] = useState("");
  const [address, setAddress] = useState({ flat: "", street: "", city: "", pincode: "", landmark: "" });`;

file = file.replace(/  const \[name, setName\] = useState\(""\);\n  const \[saving, setSaving\] = useState\(false\);/, 
  stateReplace + '\n  const [saving, setSaving] = useState(false);');

file = file.replace(/setName\(snap\.data\(\)\.name \|\| ""\);/, 
  `setName(snap.data().name || "");
        if (snap.data().addresses && snap.data().addresses.length > 0) {
          setAddress(snap.data().addresses[0]);
        } else if (snap.data().address && typeof snap.data().address === 'string') {
          setAddress(prev => ({ ...prev, street: snap.data().address }));
        }`);

const saveReplace = `await setDoc(doc(db, "users", user.uid), { name: name.trim() }, { merge: true });`;
// We won't save address here, AddressSelector will save it on change
// But wait, the "handleSave" function in profile saves the name. Let's leave address out of handleSave.

const renderReplace = `        {/* Saved Addresses */}
        <div className="mb-4">
          <AddressSelector 
            defaultAddress={address}
            onChange={async (newAddr) => {
              setAddress(newAddr);
              const db = getFirebaseFirestore();
              await setDoc(doc(db, "users", user.uid), { addresses: [newAddr] }, { merge: true });
              showToast("Address saved!", "success");
            }}
          />
        </div>`;

file = file.replace(/        \{\/\* Saved Addresses \(Phase 1\) \*\/\}\n        <div className="rounded-xl p-4 mb-4"[\s\S]*?<\/div>\n        <\/div>/m, renderReplace);

fs.writeFileSync('src/app/profile/page.tsx', file);
