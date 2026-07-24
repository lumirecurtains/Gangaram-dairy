const fs = require('fs');

let file = fs.readFileSync('src/app/checkout/page.tsx', 'utf8');

const importAdd = `import { AddressSelector } from "@/lib/components/address/AddressSelector";
import { getFirebaseFirestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";`;

file = file.replace(/import { PaymentSummary } from "@\/lib\/components\/order\/PaymentSummary";/, importAdd + '\nimport { PaymentSummary } from "@/lib/components/order/PaymentSummary";');

const stateAdd = `
  const [address, setAddress] = useState<AddressFields>({
    flat: "", street: "", city: "", pincode: "", landmark: "",
  });
  const [addressLoading, setAddressLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAddr = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.addresses && data.addresses.length > 0) {
            setAddress(data.addresses[0]);
          } else if (data.address && typeof data.address === 'string') {
            // Legacy fallback
            setAddress(prev => ({ ...prev, street: data.address }));
          }
        }
      } catch (err) {
        console.error("Failed to load address:", err);
      } finally {
        setAddressLoading(false);
      }
    };
    fetchAddr();
  }, [user]);

  const handleAddressChange = async (newAddr: AddressFields) => {
    setAddress(newAddr);
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      await updateDoc(doc(db, "users", user.uid), {
        addresses: [newAddr] // Overwrite or prepend to addresses
      });
    } catch (err) {
      console.error("Failed to save address:", err);
    }
  };`;

file = file.replace(/  const \[address, setAddress\] = useState<AddressFields>\(\{[\s\S]*?\}\);\n  const \[touched, setTouched\] = useState<TouchedFields>\(\{[\s\S]*?\}\);/m, stateAdd);

// Remove the old handlers
file = file.replace(/  const handleFieldChange = \(field: keyof AddressFields, value: string\) => \{[\s\S]*?  \};\n/m, "");
file = file.replace(/  const handleFieldBlur = \(field: keyof AddressFields\) => \{[\s\S]*?  \};\n/m, "");

// Modify handlePlaceOrder checks
file = file.replace(/\/\/ Mark all fields as touched[\s\S]*?    \}/m, `// Validate required fields
    const emptyFields = REQUIRED_FIELDS.filter((f) => !address[f]?.trim());
    if (emptyFields.length > 0) {
      showToast(\`Please fill in: \${emptyFields.map((f) => FIELD_LABELS[f]).join(", ")}\`, "error");
      return;
    }`);

file = file.replace(/  const getFieldStyle = \(field: keyof AddressFields\) => \(\{[\s\S]*?  \}\);\n/m, "");

const renderReplace = `        {/* Delivery Address */}
        <div className="mb-4">
          {addressLoading ? (
             <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
               <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
             </div>
          ) : (
            <AddressSelector 
              defaultAddress={address}
              onChange={handleAddressChange}
            />
          )}
        </div>`;

file = file.replace(/        \{\/\* Delivery Address \*\/\}\n        <div className="rounded-xl p-5 mb-4"[\s\S]*?<\/div>\n        <\/div>/m, renderReplace);

fs.writeFileSync('src/app/checkout/page.tsx', file);
