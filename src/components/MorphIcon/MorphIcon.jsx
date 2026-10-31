import React from 'react';
import { MorphIcon as MorphIconCore } from 'morphicons/react';
import {
  Activity,
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Filter,
  Folder,
  Globe,
  Headphones,
  History,
  Home,
  Info,
  Key,
  Layers,
  Lightbulb,
  ListTodo,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  Pause,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  User,
  Users,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide';
import './MorphIcon.css';

/**
 * Standard registry mapping icon names to Lucide IconNode data
 */
const ICONS = {
  // Navigation & General
  'home': Home,
  'history': History,
  'search': Search,
  'settings': Settings,
  'sliders': Sliders,
  'sliders-horizontal': SlidersHorizontal,
  'filter': Filter,
  'refresh': RefreshCw,
  'refresh-cw': RefreshCw,
  'globe': Globe,
  'sparkles': Sparkles,
  'zap': Zap,
  'key': Key,
  'cpu': Cpu,
  'shield-check': ShieldCheck,
  'folder': Folder,
  'trash': Trash2,
  'trash-2': Trash2,
  'download': Download,
  'x': X,
  'close': X,
  'plus': Plus,
  'minus': Minus,
  'check': Check,
  'check-circle': CheckCircle2,
  'check-circle-2': CheckCircle2,
  'clock': Clock,
  'calendar': Calendar,
  'menu': Menu,
  'bookmark': Bookmark,
  'list-todo': ListTodo,
  'lightbulb': Lightbulb,
  'info': Info,
  'share': Share2,
  'share-2': Share2,

  // Audio & Recording
  'mic': Mic,
  'mic-off': MicOff,
  'square': Square,
  'play': Play,
  'pause': Pause,
  'volume': Volume2,
  'volume-2': Volume2,
  'volume-1': Volume1,
  'volume-x': VolumeX,
  'headphones': Headphones,
  'activity': Activity,
  'waveform': Activity,

  // Arrows
  'swap': ArrowLeftRight,
  'arrow-left-right': ArrowLeftRight,
  'arrow-up': ArrowUp,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-down': ArrowDown,
  'chevron': ChevronDown,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,

  // Messages, Notes & Users
  'message-square': MessageSquare,
  'align-left': AlignLeft,
  'layers': Layers,
  'user': User,
  'users': Users,
  'file-text': FileText,
  'file-down': FileDown,
  'printer': Printer,
  'copy': Copy,
  'eye': Eye,
  'eye-off': EyeOff,
};

/**
 * Resolve the dynamic Lucide IconNode data based on name and state
 */
function resolveIconNode(name, state) {
  if (!name) return Sparkles;

  // 1. Multi-state Morphing Pairs (Real Spring Physics SVG Morph)
  if (name === 'menu-x' || name === 'menu') {
    const isOpen = state === 'open' || state === 'close' || state === 'x';
    return isOpen ? X : Menu;
  }

  if (name === 'play-pause') {
    const isPause = state === 'playing' || state === 'pause';
    return isPause ? Pause : Play;
  }

  if (name === 'record' || name === 'mic-square') {
    const isSquare = state === 'recording' || state === 'square';
    return isSquare ? Square : Mic;
  }

  if (name === 'copy-check') {
    const isChecked = state === 'copied' || state === 'check';
    return isChecked ? Check : Copy;
  }

  if (name === 'chevron' || name === 'chevron-down') {
    const isOpen = state === 'open' || state === 'up';
    return isOpen ? ChevronUp : ChevronDown;
  }

  if (name === 'volume' || name === 'volume-2') {
    if (state === 'muted' || state === 'off') return VolumeX;
    if (state === 'low') return Volume1;
    return Volume2;
  }

  if (name === 'eye') {
    const isHidden = state === 'hidden' || state === 'off';
    return isHidden ? EyeOff : Eye;
  }

  if (name === 'mic') {
    const isMuted = state === 'muted' || state === 'off';
    return isMuted ? MicOff : Mic;
  }

  // 2. Direct Map
  if (ICONS[name]) {
    return ICONS[name];
  }

  // 3. Fallback
  return Sparkles;
}

/**
 * MorphIcon Component powered by morphicons (https://www.morphicons.com)
 * Uses spring physics for state transitions and SVG path morphing.
 * Animation occurs on click / state change, with no hover animation.
 *
 * @param {string} name - Name of the icon (e.g. 'mic', 'globe', 'play-pause', 'copy-check')
 * @param {any} [icon] - Direct Lucide IconNode data if specified
 * @param {string} [state] - Active state for morphing (e.g. 'playing', 'square', 'copied', 'open')
 * @param {number|string} [size=18] - Pixel size or string
 * @param {string} [color='currentColor'] - Stroke / icon color
 * @param {number} [strokeWidth=2] - Stroke width
 * @param {string} [spring='bouncy'] - Physics preset: 'snappy' | 'smooth' | 'bouncy'
 * @param {string} [className=''] - Extra CSS classes
 */
export function MorphIcon({
  name,
  icon,
  state = 'default',
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  spring = 'bouncy', // 'bouncy' ensures delightful, visible spring physics on click/state changes
  className = '',
  ...props
}) {
  const iconNode = icon || resolveIconNode(name, state);
  const typeClass = name ? `morph-type-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '';

  return (
    <MorphIconCore
      icon={iconNode}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      spring={spring}
      className={`morph-icon ${typeClass} ${className}`}
      {...props}
    />
  );
}

export { MorphIconCore };
export default MorphIcon;
