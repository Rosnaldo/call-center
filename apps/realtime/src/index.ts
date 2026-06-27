import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true
});

import { Properties } from "./properties";
import { startAll } from "./initialize_services";
import './extensions/transform_in_dict';

const properties = Properties.getInstance();
void startAll(properties);
