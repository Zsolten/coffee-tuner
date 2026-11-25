(() => {
  const key = "coffee-tuner-last-tab";
  const routes = ["espresso.html", "aeropress.html"];
  const page = location.pathname.split("/").pop();
  try {
    const saved = localStorage.getItem(key);
    if (!page && !location.search && !location.hash && routes.includes(saved)) {
      location.replace("./" + saved);
      return;
    }
    localStorage.setItem(key, routes.includes(page) ? page : "v60");
  } catch {
    // Navigation works without browser storage.
  }
})();
