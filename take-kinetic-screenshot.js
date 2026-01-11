import { chromium } from 'playwright';

async function takeScreenshot() {
  console.log('🚀 Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('📱 Setting viewport...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('🌐 Navigating to Kinetic roadmap...');
    await page.goto('https://kineticdevsystems.com/roadmap', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for content to load...');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'kinetic-roadmap-reference.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved as kinetic-roadmap-reference.png');
    
    // Get some color information from the page
    console.log('🎨 Analyzing colors...');
    const colors = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="roadmap"], .bg-');
      const styles = [];
      
      cards.forEach((card, index) => {
        if (index < 5) { // Only check first 5 elements
          const computedStyle = window.getComputedStyle(card);
          styles.push({
            element: card.className,
            backgroundColor: computedStyle.backgroundColor,
            borderColor: computedStyle.borderColor,
            boxShadow: computedStyle.boxShadow
          });
        }
      });
      
      return styles;
    });
    
    console.log('🎨 Detected styles:', JSON.stringify(colors, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

takeScreenshot().catch(console.error);