# Optional Community parent for Groups

A Community is a club that may contain many Groups, but a Group does not have to belong to a Community. Club Groups and Loose Groups share one Group table; the parent is chosen at create time and is immutable. A required parent would have been a single social graph; we accepted two graphs so people can run a squad with no club.

**Considered Options**: every Group must belong to a Community; Community as a label only. Rejected: the product allows Loose Groups, and a tag is not membership.
