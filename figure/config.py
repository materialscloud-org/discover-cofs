import collections
import yaml
from os.path import join, dirname

static_dir = join(dirname(__file__), "static")

with open(join(static_dir, "columns.yml"), 'r') as f:
    try:
        quantity_list = yaml.load(f)
    except TypeError:
        quantity_list = yaml.safe_load(f)

quantities = collections.OrderedDict([(q['column'], q) for q in quantity_list])

plot_quantities = [
    q for q in quantities.keys() if quantities[q]['type'] == 'float'
]

bondtype_dict = collections.OrderedDict([
    ('amide', "#1f77b4"),
    ('amine', "#d62728"),
    ('imine', "#ff7f0e"),
    ('CC', "#2ca02c"),
    ('mixed', "#778899"),
])

with open(join(static_dir, "filters.yml"), 'r') as f:
    try:
        filter_list = yaml.load(f)
    except TypeError:
        filter_list = yaml.safe_load(f)

with open(join(static_dir, "presets.yml"), 'r') as f:
    try:
        presets = yaml.load(f)
    except TypeError:
        presets = yaml.safe_load(f)

    presets = yaml.safe_load(f)

for k in presets.keys():
    if 'clr' not in presets[k].keys():
        presets[k]['clr'] = presets['default']['clr']

max_points = 70000
