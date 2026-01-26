import WorldMap from 'react-svg-worldmap';
import { motion } from 'framer-motion';

// Visitor data by country (realistic for smaller website)
const visitorData = [
  { country: 'us', value: 850 },
  { country: 'gb', value: 320 },
  { country: 'de', value: 180 },
  { country: 'fr', value: 145 },
  { country: 'ca', value: 130 },
  { country: 'au', value: 95 },
  { country: 'br', value: 75 },
  { country: 'in', value: 68 },
  { country: 'jp', value: 55 },
  { country: 'kr', value: 48 },
  { country: 'mx', value: 42 },
  { country: 'es', value: 38 },
  { country: 'it', value: 35 },
  { country: 'nl', value: 32 },
  { country: 'pl', value: 28 },
  { country: 'se', value: 25 },
  { country: 'ru', value: 22 },
  { country: 'ph', value: 18 },
  { country: 'id', value: 15 },
  { country: 'th', value: 12 },
  { country: 'nz', value: 10 },
  { country: 'ie', value: 8 },
];

export function InteractiveWorldMap() {
  const totalVisitors = visitorData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <motion.div
          className="absolute top-1/2 left-1/2 w-[600px] h-[300px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* World Map */}
      <div className="relative w-full rounded-2xl">
        <WorldMap
          color="#06b6d4"
          backgroundColor="transparent"
          borderColor="#06b6d4"
          size="responsive"
          data={visitorData}
          valueSuffix="visitors"
          styleFunction={(context) => {
            const { countryValue, minValue, maxValue } = context;
            // Brighter outlines - countries with data are very visible
            const strokeOpacity = countryValue 
              ? 0.8 + (0.2 * (countryValue - minValue) / (maxValue - minValue))
              : 0.5;
            return {
              fill: 'transparent',
              stroke: countryValue ? `rgba(6, 182, 212, ${strokeOpacity})` : 'rgba(6, 182, 212, 0.4)',
              strokeWidth: countryValue ? 1.8 : 1.2,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            };
          }}
          tooltipTextFunction={(context) => {
            const { countryName, countryValue } = context;
            if (!countryValue) return `${countryName}: No visitors yet`;
            const percentage = ((countryValue / totalVisitors) * 100).toFixed(1);
            return `${countryName}: ${countryValue.toLocaleString()} visitors (${percentage}%)`;
          }}
        />
      </div>

      {/* Stats Cards */}
      <motion.div 
        className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {[
          { label: 'Total Visitors', value: totalVisitors.toLocaleString(), color: '#06b6d4', icon: '👥' },
          { label: 'Countries', value: `${visitorData.length}+`, color: '#8b5cf6', icon: '🌍' },
          { label: 'Top Country', value: 'United States', color: '#6366f1', icon: '🏆' },
          { label: 'Growth', value: '+24%', color: '#10b981', icon: '📈' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="relative text-center p-5 rounded-xl bg-[#0d0d14]/80 border border-[#06b6d4]/25 backdrop-blur-sm overflow-hidden group"
            whileHover={{ 
              scale: 1.02, 
              borderColor: 'rgba(6, 182, 212, 0.6)',
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at center, ${stat.color}15, transparent 70%)`,
              }}
            />
            
            <div className="relative z-10">
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-[#71717a]">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
