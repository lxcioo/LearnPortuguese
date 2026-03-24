import { Course } from '@/src/types';
import unit01 from './units/unit_01_erste_schritte.json';
import unit02 from './units/unit_02_erste_konversationen.json';
import unit03 from './units/unit_03_essen_trinken.json';
import unit04 from './units/unit_04_unterwegs.json';
import unit05 from './units/unit_05_menschen_familie.json';
import unit06 from './units/unit_06_zeit_tagesablauf.json';
import unit07 from './units/unit_07_freizeit_hobbys.json';
import unit08 from './units/unit_08_zuhause.json';
import unit09 from './units/unit_09_einkaufen_kleidung.json';
import unit10 from './units/unit_10_körper_gesundheit.json';


const content = {
  courses: [
    {
      id: "portuguese_a1",
      title: "Portugiesisch A1",
      units: [
        unit01,
        unit02,
        unit03,
        unit04,
        unit05,
        unit06,
        unit07,
        unit08,
        unit09,
        unit10
      ]
    }
  ]
} as unknown as { courses: Course[] };

export default content;