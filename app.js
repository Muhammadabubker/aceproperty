const gridEl = document.getElementById("listings-grid");
if (gridEl) {
  gridEl.innerHTML = `<p style="color:#0f2942;font-weight:bold;">Loading Firebase SDK...</p>`;
}

const base = "https://gstatic.com";

Promise.all([
  import(base + "firebase-app.js"),
  import(base + "firebase-firestore.js"),
  import(base + "firebase-auth.js")
]).then(([appMod, fsMod, authMod]) => {
  if (gridEl) {
    gridEl.innerHTML = `<p style="color:#0f2942;font-weight:bold;">Firebase SDK Loaded! Connecting to Database...</p>`;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyD-Use-VkEP4eXEEFQKtdZnNRdRRjMcldk",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "aceproperty-8a02d",
    storageBucket: "aceproperty-8a02d.firebasestorage.app",
    messagingSenderId: "195642216443",
    appId: "1:195642216443:web:ce5cfca78fd1c46d01855e",
    measurementId: "G-RDT5E0XYQC"
  };

  const app = appMod.initializeApp(firebaseConfig);
  const db = fsMod.getFirestore(app);
  const auth = authMod.getAuth(app);

  const CLOUDINARY_CLOUD_NAME = "tulzvcya";
  const CLOUDINARY_UPLOAD_PRESET = "aceproperty_unsigned";

  let allProperties = [];
  let currentFilter = "All";
  let activeUnlockId = null;
  let unlockedIds = JSON.parse(localStorage.getItem("ace_unlocked") || "[]");

  async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const uploadUrl = "https://cloudinary.com" + CLOUDINARY_CLOUD_NAME + "/auto/upload";
    const res = await fetch(uploadUrl, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Cloudinary upload failed. Verify preset 'aceproperty_unsigned' is Unsigned.");
    const data = await res.json();
    return data.secure_url;
  }

  window.handleFormSubmit = async function(e) {
    e.preventDefault();
    const pics = document.getElementById("pictures").files;
    if (pics.length < 3) return alert("Please select at least 3 actual pictures.");

    const btn = e.target.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Uploading Photos & Saving...";

    try {
      const propCode = "ACE-" + Math.floor(1000 + Math.random() * 9000);
      const imageUrls = [];
      for (let i = 0; i < pics.length; i++) {
        imageUrls.push(await uploadToCloudinary(pics[i]));
      }

      const mapFile = document.getElementById("mapScreenshot").files[0];
      const mapShotUrl = mapFile ? await uploadToCloudinary(mapFile) : "";

      const vidFile = document.getElementById("videoClip").files[0];
      const videoUrl = vidFile ? await uploadToCloudinary(vidFile) : "";

      const utilities = Array.from(document.querySelectorAll(".util-chk:checked")).map(c => c.value);

      await fsMod.addDoc(fsMod.collection(db, "properties"), {
        propCode,
        role: document.getElementById("role").value,
        category: document.getElementById("category").value,
        road: document.getElementById("road").value,
        demand: document.getElementById("demand").value,
        rent: document.getElementById("rent").value || "N/A",
        installments: document.getElementById("installments").value || "Cash",
        area: document.getElementById("area").value,
        coveredArea: document.getElementById("coveredArea").value || "N/A",
        condition: document.getElementById("condition").value,
        floorsShops: document.getElementById("floorsShops").value || "N/A",
        roomsBaths: document.getElementById("roomsBaths").value || "N/A",
        finish: document.getElementById("finish").value,
        approach: document.getElementById("approach").value || "N/A",
        qualities: document.getElementById("qualities").value,
        mapUrl: document.getElementById("mapUrl").value,
        utilities,
        imageUrls,
        mapShotUrl,
        videoUrl,
        agentPhone: document.getElementById("agentPhone").value,
        ownerPhone: document.getElementById("ownerPhone").value,
        exactAddress: document.getElementById("exactAddress").value,
        createdAt: fsMod.serverTimestamp()
      });

      alert("Published! Property Code: " + propCode);
      e.target.reset();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = "Publish Property Globally on ACE PROPERTY";
    }
  };

  const q = fsMod.query(fsMod.collection(db, "properties"), fsMod.orderBy("createdAt", "desc"));
  fsMod.onSnapshot(q, (snap) => {
    allProperties = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById("total-count").innerText = allProperties.length;
    document.getElementById("comm-count").innerText = allProperties.filter(p => p.category === "Commercial").length;
    document.getElementById("dom-count").innerText = allProperties.filter(p => p.category === "Domestic").length;
    document.getElementById("ind-count").innerText = allProperties.filter(p => p.category === "Industrial").length;
    renderListings();
  }, (err) => {
    if (gridEl) gridEl.innerHTML = `<p style="color:#b91c1c;font-weight:bold;">Firestore Error: ${err.message}</p>`;
  });

  window.filterProps = function(cat, btn) {
    currentFilter = cat;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderListings();
  };

  window.renderListings = function() {
    const s = (document.getElementById("search-box")?.value || "").toLowerCase();
    const list = allProperties.filter(p =>
      (currentFilter === "All" || p.category === currentFilter) &&
      (!s || (p.qualities || "").toLowerCase().includes(s) || (p.propCode || "").toLowerCase().includes(s) || (p.area || "").toLowerCase().includes(s))
    );

    if (!list.length) {
      gridEl.innerHTML = `<p style="color:#15803d;font-weight:600;">Connected to Cloud! No properties listed yet. Post the first property below!</p>`;
      return;
    }

    gridEl.innerHTML = list.map(p => {
      const imgs = p.imageUrls || [];
      const i1 = imgs[0] || "https://placeholder.com";
      const i2 = imgs[1] || p.mapShotUrl || i1;
      const i3 = imgs[2] || p.mapShotUrl || i1;
      const unlocked = unlockedIds.includes(p.id);
      const mapHref = (p.mapUrl || "").startsWith("http")
        ? p.mapUrl
        : "https://google.com" + encodeURIComponent(p.mapUrl || p.qualities);

      return `<div class="prop-card">
        <div class="gallery">
          <img src="${i1}" alt="Photo 1">
          <div class="gallery-side">
            <img src="${i2}" alt="Photo 2">
            <img src="${i3}" alt="Photo 3">
          </div>
        </div>
        <div class="prop-body">
          <div>
            <span class="badge">${p.propCode}</span>
            <span class="badge" style="background:var(--accent);">${p.role}</span>
            <span class="badge" style="background:#334155;">${p.category}</span>
          </div>
          <div class="price">${p.demand} ${p.rent !== "N/A" ? `| Rent: ${p.rent}` : ""}</div>
          <div class="detail"><strong>Location:</strong> ${p.qualities} (${p.road})</div>
          <div class="detail"><strong>Area:</strong> ${p.area} | <strong>Covered:</strong> ${p.coveredArea}</div>
          <div class="detail"><strong>Specs:</strong> ${p.condition} | ${p.floorsShops} | ${p.roomsBaths}</div>
          <div class="detail"><strong>Utilities:</strong> ${(p.utilities || []).join(", ") || "Standard"} | <strong>Plan:</strong> ${p.installments}</div>
          <div style="margin:6px 0;font-size:12px;">
            <a href="${mapHref}" target="_blank" style="color:#1e40af;font-weight:700;margin-right:8px;">Google Map</a>
            ${p.mapShotUrl ? `<a href="${p.mapShotUrl}" target="_blank" style="color:#0f2942;font-weight:700;margin-right:8px;">Map Shot</a>` : ""}
            ${p.videoUrl ? `<a href="${p.videoUrl}" target="_blank" style="color:#b91c1c;font-weight:700;">Video</a>` : ""}
          </div>
          <div class="agent-box"><strong>Public Agent / Ref:</strong> ${p.agentPhone}</div>
          ${unlocked
            ? `<div class="unlocked-box"><strong>Owner Phone:</strong> ${p.ownerPhone}<br><strong>Address:</strong> ${p.exactAddress}</div>`
            : `<div class="locked-box"><strong>Owner Hidden</strong><button class="btn-unlock" onclick="openUnlockModal('${p.id}','${p.propCode}')">Unlock Owner ($10 / PKR or $25)</button></div>`}
        </div>
      </div>`;
    }).join("");
  };

  window.openUnlockModal = function(id, code) {
    activeUnlockId = id;
    document.getElementById("modal-prop-code").innerText = code;
    document.getElementById("unlock-modal").style.display = "flex";
  };

  window.closeModal = function() {
    document.getElementById("unlock-modal").style.display = "none";
  };

  window.sendOtpCode = function() {
    const phone = document.getElementById("viewer-phone").value.trim();
    if (!phone.startsWith("+")) return alert("Include country code (e.g. +923001234567)");
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new authMod.RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
    authMod.signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
      .then(res => {
        window.confirmationResult = res;
        document.getElementById("otp-verify-box").style.display = "block";
        alert("OTP Sent!");
      })
      .catch(e => alert(e.message));
  };

  window.verifyOtpAndUnlock = function() {
    window.confirmationResult.confirm(document.getElementById("otp-code").value.trim())
      .then(() => {
        if (activeUnlockId && !unlockedIds.includes(activeUnlockId)) {
          unlockedIds.push(activeUnlockId);
          localStorage.setItem("ace_unlocked", JSON.stringify(unlockedIds));
        }
