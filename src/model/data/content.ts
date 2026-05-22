import { Course } from '@/src/model/types';
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
import unit11 from './units/unit_11_arbeit_beruf.json';
import unit12 from './units/unit_12_technologie.json';
import unit13 from './units/unit_13_bildung_universitaet.json';
import unit14 from './units/unit_14_natur_wetter.json';
import unit15 from './units/unit_15_kultur_traditionen.json';
import unit16 from './units/unit_16_banken_finanzen.json';
import unit17 from './units/unit_17_gefuehle_meinungen.json';
import unit18 from './units/unit_18_medien_nachrichten.json';
import unit19 from './units/unit_19_fortgeschrittenes_reisen.json';
import unit20 from './units/unit_20_zukunft_traeume.json';


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
        unit10,
        unit11,
        unit12,
        unit13,
        unit14,
        unit15,
        unit16,
        unit17,
        unit18,
        unit19,
        unit20
      ]
    }
  ]
} as unknown as { courses: Course[] };

export default content;