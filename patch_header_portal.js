const fs = require('fs');
let content = fs.readFileSync('components/header-search-button.tsx', 'utf8');

const oldUseEffect = `  useEffect(() => {
    // Portals can only be used on the client-side after the DOM has mounted
    setDesktopPortal(document.getElementById('header-search-portal'))
    setMobilePortal(document.getElementById('mobile-header-search-portal'))
  }, [])`;

const newUseEffect = `  useEffect(() => {
    // Portals can only be used on the client-side after the DOM has mounted
    setDesktopPortal(document.getElementById('header-search-portal'))

    // Mobile portal might mount later, so check periodically
    const checkMobilePortal = () => {
      const el = document.getElementById('mobile-header-search-portal')
      if (el) {
        setMobilePortal(el)
        return true
      }
      return false
    }

    if (!checkMobilePortal()) {
      const interval = setInterval(() => {
        if (checkMobilePortal()) {
          clearInterval(interval)
        }
      }, 500)

      return () => clearInterval(interval)
    }
  }, [])`;

content = content.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('components/header-search-button.tsx', content);
