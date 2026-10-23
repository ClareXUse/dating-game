"""Exact decimal validation; practice decisions are documented in docs/RULES.md."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

D = Decimal

def vector(value, n, low, high, places):
    if not isinstance(value, list) or len(value) != n:
        raise ValueError('Expected a vector of exactly %d numbers' % n)
    out = []
    for item in value:
        if isinstance(item, bool) or not isinstance(item, (int, float, str, Decimal)):
            raise ValueError('Vector entries must be finite numbers')
        try:
            x = D(str(item))
        except InvalidOperation:
            raise ValueError('Invalid number')
        if not x.is_finite() or not low <= x <= high or x != x.quantize(D(10) ** -places):
            raise ValueError('Number outside range or too many decimal places')
        out.append(x)
    return out

def candidate(value, n):
    return vector(value, n, D(0), D(1), 4)

def weights(value, n):
    w = vector(value, n, D(-1), D(1), 2)
    if sum(x for x in w if x > 0) != 1 or sum(x for x in w if x < 0) != -1:
        raise ValueError('Positive weights must sum to 1; negative weights to -1')
    return w

def dot(w, c):
    return sum((x*y for x, y in zip(w, c)), D(0))

def display(value):
    return format(value.quantize(D('.0001'), rounding=ROUND_HALF_UP), '.4f')

def setup(reply, n):
    original = weights(reply.get('weights'), n)
    if dot(original, candidate(reply.get('ideal'), n)) != 1:
        raise ValueError('ideal must score exactly 1')
    if dot(original, candidate(reply.get('anti_ideal'), n)) != -1:
        raise ValueError('anti_ideal must score exactly -1')
    return original

def update(reply, original, current):
    if 'weights' not in reply:
        return current
    new = weights(reply['weights'], len(original))
    if sum(x != y for x, y in zip(new, current)) > len(original)//20:
        raise ValueError('Too many changed coordinates in one turn')
    if any(abs(x-o) > abs(o)*D('.2') for x, o in zip(new, original)):
        raise ValueError('An updated weight is outside 20% of its original value')
    return new
