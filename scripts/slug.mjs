#!/usr/bin/env node
import { topicSlug } from './lib/slug.mjs';
process.stdout.write(topicSlug(process.argv[2] ?? '') + '\n');
