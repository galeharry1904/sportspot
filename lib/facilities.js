// Single source of truth for the facility checklist venues can publicise —
// keeps the dashboard editor and the fan-facing map display in sync so a
// facility can't show up on one and not the other.
import {
  Tv, MonitorPlay, Volume2, Utensils, Beer, Wifi, TreePine, CircleDot,
  Target, HelpCircle, Music, Accessibility, Dog, Users, ParkingCircle,
  DoorOpen, Flag,
} from './icons'

export const FACILITIES = [
  { id: 'big_screen', label: 'Big Screen', icon: Tv },
  { id: 'multiple_screens', label: 'Multiple Screens', icon: MonitorPlay },
  { id: 'sound_on', label: 'Sound On for Games', icon: Volume2 },
  { id: 'food_served', label: 'Food Served', icon: Utensils },
  { id: 'real_ale', label: 'Real Ale / Craft Beer', icon: Beer },
  { id: 'free_wifi', label: 'Free WiFi', icon: Wifi },
  { id: 'beer_garden', label: 'Beer Garden / Outdoor Seating', icon: TreePine },
  { id: 'pool_table', label: 'Pool Table', icon: CircleDot },
  { id: 'darts', label: 'Darts', icon: Target },
  { id: 'quiz_nights', label: 'Quiz Nights', icon: HelpCircle },
  { id: 'live_music', label: 'Live Music', icon: Music },
  { id: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: Accessibility },
  { id: 'dog_friendly', label: 'Dog Friendly', icon: Dog },
  { id: 'family_friendly', label: 'Family Friendly', icon: Users },
  { id: 'parking', label: 'Parking', icon: ParkingCircle },
  { id: 'function_room', label: 'Function Room / Private Hire', icon: DoorOpen },
  { id: 'away_fans_welcome', label: 'Away Fans Welcome', icon: Flag },
]

export function facilityLabel(id) {
  return FACILITIES.find(f => f.id === id)?.label || id
}
