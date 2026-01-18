import { Branch } from '../../types';

export const getMarkerHtml = (branch: Branch, isSelected: boolean) => {
  // Cyber-Physical Color Palettes
  let mainColor = '#3b82f6'; // Blue
  let glowColor = 'rgba(59, 130, 246, 0.4)';
  let pulseRing = '';

  if (branch.status === 'critical') {
    mainColor = '#ef4444'; // Red
    glowColor = 'rgba(239, 68, 68, 0.5)';
    pulseRing = `
        <div class="absolute inset-0 rounded-full border-2 border-red-500 opacity-0 animate-ping-slow"></div>
        <div class="absolute inset-[-4px] rounded-full border border-red-500 opacity-0 animate-ping-slower delay-300"></div>
      `;
  } else if (branch.status === 'warning') {
    mainColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.5)';
  } else {
    mainColor = '#10b981'; // Emerald (Operational)
    glowColor = 'rgba(16, 185, 129, 0.4)';
  }

  return `
    <div class="relative w-16 h-16 flex items-center justify-center group cursor-pointer" style="transform-style: preserve-3d;">
        <!-- Ground Shadow -->
        <div class="absolute bottom-2 w-8 h-3 bg-black/30 rounded-[100%] blur-[2px] transition-all duration-300 group-hover:w-10 group-hover:h-4 group-hover:opacity-50"></div>
        <!-- Pulse Rings (For Critical/Warning) -->
        ${pulseRing}
        <!-- 3D Pin Interaction Container (Handles Scaling & Selection Lift) -->
        <div class="relative transition-all duration-500 ease-out ${isSelected ? 'scale-125 -translate-y-4' : 'group-hover:-translate-y-2'}">
            <!-- 3D Pin Animation Container (Handles Floating Loop) -->
            <div class="marker-float">
                <!-- Pin Head -->
                <div class="relative w-10 h-10">
                     <!-- Outer Glow / Glass -->
                     <div class="absolute inset-0 bg-white rounded-full border-2 border-white overflow-hidden" style="box-shadow: 0 4px 10px ${glowColor}">
                        <div class="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-black"></div>
                        <!-- Status Fill -->
                        <div class="absolute inset-1 rounded-full shadow-inner flex items-center justify-center" style="background: linear-gradient(to bottom right, ${mainColor}, #0f172a)">
                            <!-- Inner Icon -->
                            <svg viewBox="0 0 24 24" class="w-5 h-5 text-white drop-shadow-md">
                                <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                <circle cx="12" cy="9" r="2.5" fill="white"/>
                            </svg>
                        </div>
                        <!-- Specular Highlight -->
                        <div class="absolute top-1 left-2 w-3 h-2 bg-white/40 rounded-[100%] blur-[1px]"></div>
                     </div>
                </div>
                <!-- Pin Needle -->
                <div class="absolute top-[95%] left-1/2 -translate-x-1/2 w-1 h-4 bg-gradient-to-b from-gray-400 to-transparent opacity-80"></div>
            </div>
        </div>
        <!-- Floating Label -->
        <div class="absolute top-full mt-2 transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-90 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}">
            <div class="px-3 py-1.5 bg-slate-900/95 backdrop-blur text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xl border border-white/20 flex items-center gap-2 whitespace-nowrap">
               <div class="w-2 h-2 rounded-full" style="background-color: ${mainColor}; box-shadow: 0 0 5px ${mainColor}"></div>
               ${branch.name}
            </div>
        </div>
    </div>
  `;
};
